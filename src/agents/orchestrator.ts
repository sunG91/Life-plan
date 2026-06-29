import { chatCompletion } from '../services/doubao'
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

export async function orchestratePlan(
  settings: AppSettings,
  userGoal: string,
  onStatus: StatusCallback,
): Promise<LifePlan> {
  const statuses = initStatuses()
  const update = (role: AgentRole, patch: Partial<AgentStatus>) => {
    const idx = statuses.findIndex((s) => s.role === role)
    if (idx >= 0) statuses[idx] = { ...statuses[idx], ...patch }
    onStatus([...statuses])
  }

  update('motivation', { status: 'running' })
  const motivation = await chatCompletion(settings, [
    { role: 'system', content: MOTIVATION_SYSTEM },
    { role: 'user', content: `用户的人生目标：${userGoal}\n\n请给出温暖的励志开场。` },
  ], { temperature: 0.85, maxTokens: 512 })
  update('motivation', { status: 'done' })

  update('planner', { status: 'running' })
  const overview = await chatCompletion(settings, [
    { role: 'system', content: PLANNER_SYSTEM },
    {
      role: 'user',
      content: `用户目标：${userGoal}\n\n请制定详细的最佳路线规划。`,
    },
  ], { temperature: 0.7, maxTokens: 3000 })
  update('planner', { status: 'done' })

  const context = `用户目标：${userGoal}\n\n路线规划：\n${overview}`

  update('timeline', { status: 'running' })
  update('tasks', { status: 'running' })
  update('document', { status: 'running' })

  const [timelineRaw, tasksRaw, document] = await Promise.all([
    chatCompletion(settings, [
      { role: 'system', content: TIMELINE_SYSTEM },
      { role: 'user', content: context },
    ], { temperature: 0.5, maxTokens: 2000 }).then((r) => {
      update('timeline', { status: 'done' })
      return r
    }).catch((e) => {
      update('timeline', { status: 'error', message: e.message })
      return ''
    }),

    chatCompletion(settings, [
      { role: 'system', content: TASKS_SYSTEM },
      { role: 'user', content: context },
    ], { temperature: 0.5, maxTokens: 2000 }).then((r) => {
      update('tasks', { status: 'done' })
      return r
    }).catch((e) => {
      update('tasks', { status: 'error', message: e.message })
      return ''
    }),

    chatCompletion(settings, [
      { role: 'system', content: DOCUMENT_SYSTEM },
      { role: 'user', content: `${context}\n\n请生成完整规划文档。` },
    ], { temperature: 0.6, maxTokens: 4000 }).then((r) => {
      update('document', { status: 'done' })
      return r
    }).catch((e) => {
      update('document', { status: 'error', message: e.message })
      return overview
    }),
  ])

  const timelineData = parseJson<{ phases: Omit<TimelinePhase, 'id'>[] }>(timelineRaw)
  const tasksData = parseJson<{ tasks: Omit<TaskItem, 'id' | 'completed'>[] }>(tasksRaw)

  const timeline: TimelinePhase[] = (timelineData?.phases ?? []).map((p) => ({
    ...p,
    id: uid(),
  }))

  const tasks: TaskItem[] = (tasksData?.tasks ?? []).map((t) => ({
    ...t,
    id: uid(),
    completed: false,
    priority: t.priority ?? 'medium',
  }))

  return {
    id: uid(),
    goal: userGoal,
    createdAt: Date.now(),
    motivation,
    overview,
    timeline,
    tasks,
    document: document || overview,
  }
}
