import type { AppSettings } from '../types'

const SETTINGS_KEY = 'life-planner-settings'
const PLANS_KEY = 'life-planner-plans'
const CHAT_KEY = 'life-planner-chat'

export const defaultSettings = (): AppSettings => ({
  apiKey: '',
  endpointId: '',
  modelId: '',
  useEndpoint: true,
})

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

export function loadPlans<T>(): T[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePlans<T>(plans: T[]): void {
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
