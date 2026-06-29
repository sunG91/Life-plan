import type { AppSettings, LifePlan, PlanRecordExport } from '../types'

const SETTINGS_KEY = 'life-planner-settings'
const PLANS_KEY = 'life-planner-plans'
const CHAT_KEY = 'life-planner-chat'

export const defaultSettings = (): AppSettings => ({
  apiKey: '',
  endpointId: '',
  modelId: '',
  useEndpoint: true,
})

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function normalizePlan(raw: Partial<LifePlan>): LifePlan {
  const createdAt = raw.createdAt ?? Date.now()
  return {
    id: raw.id ?? uid(),
    goal: raw.goal ?? '',
    createdAt,
    updatedAt: raw.updatedAt ?? createdAt,
    motivation: raw.motivation ?? '',
    overview: raw.overview ?? '',
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    document: raw.document ?? '',
    note: raw.note ?? '',
    status: raw.status === 'archived' ? 'archived' : 'active',
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings()
    return { ...defaultSettings(), ...JSON.parse(raw) }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadPlans(): LifePlan[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: Partial<LifePlan>) => normalizePlan(item))
  } catch {
    return []
  }
}

export function savePlans(plans: LifePlan[]): void {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans))
}

export function loadChatHistory<T>(): T[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveChatHistory<T>(messages: T[]): void {
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages))
}

export function exportPlanRecords(plans: LifePlan[]): PlanRecordExport {
  return {
    version: 1,
    app: 'life-plan',
    exportedAt: Date.now(),
    plans,
  }
}

export function parseImportedRecords(text: string): LifePlan[] {
  const data = JSON.parse(text) as PlanRecordExport | LifePlan[]

  if (Array.isArray(data)) {
    return data.map((item) => normalizePlan(item))
  }

  if (data && data.app === 'life-plan' && Array.isArray(data.plans)) {
    return data.plans.map((item) => normalizePlan(item))
  }

  if (data && Array.isArray((data as PlanRecordExport).plans)) {
    return (data as PlanRecordExport).plans.map((item) => normalizePlan(item))
  }

  throw new Error('无效的档案备份文件格式')
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
