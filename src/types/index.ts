export interface AppSettings {
  apiKey: string
  endpointId: string
  modelId: string
  useEndpoint: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agent?: AgentRole
  timestamp: number
}

export type AgentRole =
  | 'motivation'
  | 'planner'
  | 'timeline'
  | 'tasks'
  | 'document'
  | 'orchestrator'

export interface AgentStatus {
  role: AgentRole
  name: string
  status: 'idle' | 'running' | 'done' | 'error'
  message?: string
}

export interface TimelinePhase {
  id: string
  title: string
  period: string
  description: string
  milestones: string[]
}

export interface TaskItem {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  deadline?: string
  completed: boolean
  phase?: string
}

export interface LifePlan {
  id: string
  goal: string
  createdAt: number
  motivation: string
  overview: string
  timeline: TimelinePhase[]
  tasks: TaskItem[]
  document: string
}

export interface DoubaoMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (fullText: string) => void
  onError: (error: Error) => void
}
