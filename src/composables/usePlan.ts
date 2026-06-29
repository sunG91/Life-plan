import { ref } from 'vue'
import { orchestratePlan } from '../agents/orchestrator'
import { loadPlans, savePlans } from '../services/storage'
import { useSettings } from './useSettings'
import type { AgentStatus, LifePlan } from '../types'

const plans = ref<LifePlan[]>(loadPlans<LifePlan>())
const currentPlan = ref<LifePlan | null>(null)
const planning = ref(false)
const agentStatuses = ref<AgentStatus[]>([])

export function usePlan() {
  const { settings } = useSettings()

  function persist() {
    savePlans(plans.value)
  }

  async function generatePlan(goal: string): Promise<LifePlan | null> {
    if (!goal.trim() || planning.value) return null

    planning.value = true
    agentStatuses.value = []

    try {
      const plan = await orchestratePlan(settings.value, goal.trim(), (statuses) => {
        agentStatuses.value = statuses
      })
      plans.value.unshift(plan)
      currentPlan.value = plan
      persist()
      return plan
    } finally {
      planning.value = false
    }
  }

  function selectPlan(plan: LifePlan) {
    currentPlan.value = plan
  }

  function toggleTask(planId: string, taskId: string) {
    const plan = plans.value.find((p) => p.id === planId)
    const task = plan?.tasks.find((t) => t.id === taskId)
    if (task) {
      task.completed = !task.completed
      persist()
      if (currentPlan.value?.id === planId) {
        currentPlan.value = { ...plan! }
      }
    }
  }

  function deletePlan(planId: string) {
    plans.value = plans.value.filter((p) => p.id !== planId)
    if (currentPlan.value?.id === planId) {
      currentPlan.value = plans.value[0] ?? null
    }
    persist()
  }

  return {
    plans,
    currentPlan,
    planning,
    agentStatuses,
    generatePlan,
    selectPlan,
    toggleTask,
    deletePlan,
  }
}
