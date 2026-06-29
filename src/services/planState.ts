import type { AgentRole, GenerationState, LifePlan } from '../types'
import { REQUIRED_AGENTS } from '../types'

export function inferCompletedAgents(raw: Partial<LifePlan>): AgentRole[] {
  const done: AgentRole[] = []
  const explicit = raw.completedAgents ?? []

  if (raw.motivation?.trim()) done.push('motivation')

  if (raw.overview?.trim()) {
    const plannerFinished =
      raw.generationState === 'completed'
      || explicit.includes('planner')
      || !!raw.timeline?.length
      || !!raw.tasks?.length
      || !!raw.document?.trim()
    if (plannerFinished) done.push('planner')
  }

  if (raw.timeline?.length) done.push('timeline')
  if (raw.tasks?.length) done.push('tasks')
  if (raw.document?.trim()) done.push('document')
  return done
}

export function isPlanComplete(plan: Partial<LifePlan>): boolean {
  const agents = plan.completedAgents?.length
    ? plan.completedAgents
    : inferCompletedAgents(plan)
  return REQUIRED_AGENTS.every((role) => agents.includes(role))
}

export function inferGenerationState(raw: Partial<LifePlan>): GenerationState {
  if (raw.generationState) {
    if (raw.generationState === 'generating' && isPlanComplete(raw)) {
      return 'completed'
    }
    return raw.generationState
  }
  if (isPlanComplete(raw)) return 'completed'
  if (inferCompletedAgents(raw).length > 0) return 'interrupted'
  return 'pending'
}

export function canResumePlan(plan: LifePlan): boolean {
  return plan.generationState !== 'completed' && !isPlanComplete(plan)
}

export function normalizeInterruptedPlans(plans: LifePlan[]): LifePlan[] {
  return plans.map((plan) => {
    if (plan.generationState !== 'generating') return plan
    return {
      ...plan,
      generationState: 'interrupted' as const,
      completedAgents: inferCompletedAgents(plan),
    }
  })
}
