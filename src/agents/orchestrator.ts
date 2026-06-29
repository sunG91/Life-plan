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

function initStatuses(completed: Set<AgentRole>): AgentStatus[] {
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
    status: completed.has(role) ? ('done' as const) : ('idle' as const),
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

function emitProgress(
  onProgress: PlanProgressCallback | undefined,
  completed: Set<AgentRole>,
  patch: Partial<LifePlan>,
) {
  onProgress?.({
    ...patch,
    completedAgents: [...completed],
    generationState: 'generating',
  })
}

export async function orchestratePlan(
  settings: AppSettings,
  userGoal: string,
  onStatus: StatusCallback,
  onProgress?: PlanProgressCallback,
  resumePlan?: LifePlan,
): Promise<LifePlan> {
  const completed = new Set<AgentRole>(resumePlan?.completedAgents ?? [])
  const statuses = initStatuses(completed)
  const update = (role: AgentRole, patch: Partial<AgentStatus>) => {
    const idx = statuses.findIndex((s) => s.role === role)
    if (idx >= 0) statuses[idx] = { ...statuses[idx], ...patch }
    onStatus([...statuses])
  }
  onStatus([...statuses])

  let motivation = resumePlan?.motivation ?? ''
  let overview = resumePlan?.overview ?? ''
  let timeline: TimelinePhase[] = resumePlan?.timeline ?? []
  let tasks: TaskItem[] = resumePlan?.tasks ?? []
  let document = resumePlan?.document ?? ''

  const phase1: Promise<void>[] = []

  if (!completed.has('motivation')) {
    update('motivation', { status: 'running' })
    phase1.push(
      streamText(
        settings,
        [
          { role: 'system', content: MOTIVATION_SYSTEM },
          { role: 'user', content: `用户的人生目标：${userGoal}\n\n请给出温暖的励志开场。` },
        ],
        { temperature: 0.85, maxTokens: 512 },
        (text) => emitProgress(onProgress, completed, { motivation: text }),
      ).then((text) => {
        motivation = text
        completed.add('motivation')
        emitProgress(onProgress, completed, { motivation })
        update('motivation', { status: 'done' })
      }),
    )
  }

  if (!completed.has('planner')) {
    update('planner', { status: 'running' })
    phase1.push(
      streamText(
        settings,
        [
          { role: 'system', content: PLANNER_SYSTEM },
          { role: 'user', content: `用户目标：${userGoal}\n\n请制定详细的最佳路线规划。` },
        ],
        { temperature: 0.7, maxTokens: 4096 },
        (text) => emitProgress(onProgress, completed, { overview: text }),
      ).then((text) => {
        overview = text
        completed.add('planner')
        emitProgress(onProgress, completed, { overview })
        update('planner', { status: 'done' })
      }),
    )
  }

  await Promise.all(phase1)

  if (!overview.trim()) {
    throw new Error('路径规划未完成，无法继续生成后续内容')
  }

  const context = `用户目标：${userGoal}\n\n路线规划：\n${overview}`
  const phase2: Promise<void>[] = []

  if (!completed.has('timeline')) {
    update('timeline', { status: 'running' })
    phase2.push(
      chatCompletion(
        settings,
        [
          { role: 'system', content: TIMELINE_SYSTEM },
          { role: 'user', content: context },
        ],
        { temperature: 0.5, maxTokens: 2500 },
      )
        .then((r) => {
          const timelineData = parseJson<{ phases: Omit<TimelinePhase, 'id'>[] }>(r)
          timeline = (timelineData?.phases ?? []).map((p) => ({ ...p, id: uid() }))
          completed.add('timeline')
          emitProgress(onProgress, completed, { timeline })
          update('timeline', { status: 'done' })
        })
        .catch((e) => {
          update('timeline', { status: 'error', message: e.message })
          throw e
        }),
    )
  }

  if (!completed.has('tasks')) {
    update('tasks', { status: 'running' })
    phase2.push(
      chatCompletion(
        settings,
        [
          { role: 'system', content: TASKS_SYSTEM },
          { role: 'user', content: context },
        ],
        { temperature: 0.5, maxTokens: 2500 },
      )
        .then((r) => {
          const tasksData = parseJson<{ tasks: Omit<TaskItem, 'id' | 'completed'>[] }>(r)
          tasks = (tasksData?.tasks ?? []).map((t) => ({
            ...t,
            id: uid(),
            completed: false,
            priority: t.priority ?? 'medium',
          }))
          completed.add('tasks')
          emitProgress(onProgress, completed, { tasks })
          update('tasks', { status: 'done' })
        })
        .catch((e) => {
          update('tasks', { status: 'error', message: e.message })
          throw e
        }),
    )
  }

  if (!completed.has('document')) {
    update('document', { status: 'running' })
    phase2.push(
      streamText(
        settings,
        [
          { role: 'system', content: DOCUMENT_SYSTEM },
          { role: 'user', content: `${context}\n\n请生成完整规划文档。` },
        ],
        { temperature: 0.6, maxTokens: 6000 },
        (text) => emitProgress(onProgress, completed, { document: text }),
      )
        .then((text) => {
          document = text
          completed.add('document')
          emitProgress(onProgress, completed, { document })
          update('document', { status: 'done' })
        })
        .catch((e) => {
          update('document', { status: 'error', message: e.message })
          throw e
        }),
    )
  }

  await Promise.all(phase2)

  return normalizePlan({
    id: resumePlan?.id ?? uid(),
    goal: userGoal,
    createdAt: resumePlan?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    motivation,
    overview,
    timeline,
    tasks,
    document: document || overview,
    note: resumePlan?.note ?? '',
    status: resumePlan?.status ?? 'active',
    generationState: 'completed',
    completedAgents: [...completed],
  })
}
