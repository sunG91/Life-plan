import { chatCompletion, chatCompletionStream } from '../services/doubao'
import { normalizePlan } from '../services/storage'
import type {
  AgentRole,
  AgentStatus,
  AppSettings,
  LifePlan,
  TaskItem,
  TimelinePhase,
} from '../types'
import {
  DOCUMENT_SYSTEM,
  MOTIVATION_SYSTEM,
  PLANNER_SYSTEM,
  TASKS_SYSTEM,
  TIMELINE_SYSTEM,
} from './prompts'

export type StatusCallback = (statuses: AgentStatus[]) => void
export type PlanProgressCallback = (patch: Partial<LifePlan>) => void

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function parseJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}

function initStatuses(): AgentStatus[] {
  const roles: AgentRole[] = ['motivation', 'planner', 'timeline', 'tasks', 'document']
  return roles.map((role) => ({
    role,
    name: {
      motivation: '初心守护者',
      planner: '路径规划师',
      timeline: '时间轴编排师',
      tasks: '任务拆解师',
      document: '文档撰写师',
      orchestrator: '总协调官',
    }[role],
    status: 'idle' as const,
  }))
}

function streamText(
  settings: AppSettings,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: { temperature?: number; maxTokens?: number },
  onText: (text: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = ''
    chatCompletionStream(
      settings,
      messages,
      {
        onToken: (token) => {
          text += token
          onText(text)
        },
        onDone: (fullText) => resolve(fullText || text),
        onError: reject,
      },
      options,
    ).catch(reject)
  })
}

export async function orchestratePlan(
  settings: AppSettings,
  userGoal: string,
  onStatus: StatusCallback,
  onProgress?: PlanProgressCallback,
): Promise<LifePlan> {
  const statuses = initStatuses()
  const update = (role: AgentRole, patch: Partial<AgentStatus>) => {
    const idx = statuses.findIndex((s) => s.role === role)
    if (idx >= 0) statuses[idx] = { ...statuses[idx], ...patch }
    onStatus([...statuses])
  }

  update('motivation', { status: 'running' })
  const motivation = await streamText(settings, [
    { role: 'system', content: MOTIVATION_SYSTEM },
    { role: 'user', content: `用户的人生目标：${userGoal}\n\n请给出温暖的励志开场。` },
  ], { temperature: 0.85, maxTokens: 512 }, (text) => onProgress?.({ motivation: text }))
  onProgress?.({ motivation })
  update('motivation', { status: 'done' })

  update('planner', { status: 'running' })
  const overview = await streamText(settings, [
    { role: 'system', content: PLANNER_SYSTEM },
    {
      role: 'user',
      content: `用户目标：${userGoal}\n\n请制定详细的最佳路线规划。`,
    },
  ], { temperature: 0.7, maxTokens: 3000 }, (text) => onProgress?.({ overview: text }))
  onProgress?.({ overview })
  update('planner', { status: 'done' })

  const context = `用户目标：${userGoal}\n\n路线规划：\n${overview}`

  update('timeline', { status: 'running' })
  update('tasks', { status: 'running' })
  update('document', { status: 'running' })

  const [timeline, tasks, document] = await Promise.all([
    chatCompletion(settings, [
      { role: 'system', content: TIMELINE_SYSTEM },
      { role: 'user', content: context },
    ], { temperature: 0.5, maxTokens: 2000 }).then((r) => {
      const timelineData = parseJson<{ phases: Omit<TimelinePhase, 'id'>[] }>(r)
      const phases: TimelinePhase[] = (timelineData?.phases ?? []).map((p) => ({
        ...p,
        id: uid(),
      }))
      onProgress?.({ timeline: phases })
      update('timeline', { status: 'done' })
      return phases
    }).catch((e) => {
      update('timeline', { status: 'error', message: e.message })
      return []
    }),

    chatCompletion(settings, [
      { role: 'system', content: TASKS_SYSTEM },
      { role: 'user', content: context },
    ], { temperature: 0.5, maxTokens: 2000 }).then((r) => {
      const tasksData = parseJson<{ tasks: Omit<TaskItem, 'id' | 'completed'>[] }>(r)
      const items: TaskItem[] = (tasksData?.tasks ?? []).map((t) => ({
        ...t,
        id: uid(),
        completed: false,
        priority: t.priority ?? 'medium',
      }))
      onProgress?.({ tasks: items })
      update('tasks', { status: 'done' })
      return items
    }).catch((e) => {
      update('tasks', { status: 'error', message: e.message })
      return []
    }),

    streamText(settings, [
      { role: 'system', content: DOCUMENT_SYSTEM },
      { role: 'user', content: `${context}\n\n请生成完整规划文档。` },
    ], { temperature: 0.6, maxTokens: 4000 }, (text) => onProgress?.({ document: text })).then((r) => {
      onProgress?.({ document: r })
      update('document', { status: 'done' })
      return r
    }).catch((e) => {
      update('document', { status: 'error', message: e.message })
      return overview
    }),
  ])

  return normalizePlan({
    id: uid(),
    goal: userGoal,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    motivation,
    overview,
    timeline,
    tasks,
    document: document || overview,
    note: '',
    status: 'active',
  })
}
