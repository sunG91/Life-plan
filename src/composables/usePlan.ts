import { ref } from 'vue'
import { orchestratePlan } from '../agents/orchestrator'
import {
  downloadJson,
  exportPlanRecords,
  loadPlans,
  normalizePlan,
  parseImportedRecords,
  savePlans,
} from '../services/storage'
import { useSettings } from './useSettings'
import type { AgentStatus, LifePlan, PlanStatus } from '../types'

const plans = ref<LifePlan[]>(loadPlans())
const currentPlan = ref<LifePlan | null>(plans.value[0] ?? null)
const planning = ref(false)
const agentStatuses = ref<AgentStatus[]>([])

function touchPlan(plan: LifePlan): LifePlan {
  return { ...plan, updatedAt: Date.now() }
}

function syncCurrent(planId: string, updater: (plan: LifePlan) => LifePlan) {
  const index = plans.value.findIndex((p) => p.id === planId)
  if (index < 0) return
  const next = updater(plans.value[index])
  plans.value[index] = next
  if (currentPlan.value?.id === planId) {
    currentPlan.value = { ...next }
  }
  savePlans(plans.value)
}

export function usePlan() {
  const { settings } = useSettings()

  async function generatePlan(goal: string): Promise<LifePlan | null> {
    if (!goal.trim() || planning.value) return null

    planning.value = true
    agentStatuses.value = []

    const now = Date.now()
    const draft = normalizePlan({
      id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
      goal: goal.trim(),
      createdAt: now,
      updatedAt: now,
      status: 'active',
    })
    currentPlan.value = draft

    try {
      const plan = await orchestratePlan(
        settings.value,
        goal.trim(),
        (statuses) => {
          agentStatuses.value = statuses
        },
        (patch) => {
          currentPlan.value = normalizePlan({
            ...(currentPlan.value ?? draft),
            ...patch,
            updatedAt: Date.now(),
          })
        },
      )

      const finalPlan = normalizePlan({
        ...plan,
        id: draft.id,
        createdAt: draft.createdAt,
        updatedAt: Date.now(),
        note: draft.note,
        status: draft.status,
      })

      plans.value = [finalPlan, ...plans.value.filter((p) => p.id !== finalPlan.id)]
      currentPlan.value = finalPlan
      savePlans(plans.value)
      return finalPlan
    } catch (err) {
      currentPlan.value = plans.value[0] ?? null
      throw err
    } finally {
      planning.value = false
    }
  }

  function selectPlan(plan: LifePlan) {
    currentPlan.value = plan
  }

  function toggleTask(planId: string, taskId: string) {
    syncCurrent(planId, (plan) => {
      const tasks = plan.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      )
      return touchPlan({ ...plan, tasks })
    })
  }

  function updateNote(planId: string, note: string) {
    syncCurrent(planId, (plan) => touchPlan({ ...plan, note }))
  }

  function setStatus(planId: string, status: PlanStatus) {
    syncCurrent(planId, (plan) => touchPlan({ ...plan, status }))
  }

  function deletePlan(planId: string) {
    plans.value = plans.value.filter((p) => p.id !== planId)
    if (currentPlan.value?.id === planId) {
      currentPlan.value = plans.value[0] ?? null
    }
    savePlans(plans.value)
  }

  function exportAllRecords() {
    downloadJson(
      exportPlanRecords(plans.value),
      `life-plan-records-${new Date().toISOString().slice(0, 10)}.json`,
    )
  }

  function exportSingleRecord(planId: string) {
    const plan = plans.value.find((p) => p.id === planId)
    if (!plan) return
    downloadJson(exportPlanRecords([plan]), `life-plan-${plan.goal.slice(0, 12)}.json`)
  }

  async function importRecords(file: File, mode: 'merge' | 'replace' = 'merge') {
    const text = await file.text()
    const imported = parseImportedRecords(text)
    if (!imported.length) {
      throw new Error('备份文件中没有可用的规划记录')
    }

    if (mode === 'replace') {
      plans.value = imported
    } else {
      const map = new Map(plans.value.map((plan) => [plan.id, plan]))
      for (const plan of imported) {
        map.set(plan.id, plan)
      }
      plans.value = [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt)
    }

    currentPlan.value = plans.value[0] ?? null
    savePlans(plans.value)
    return imported.length
  }

  function taskProgress(plan: LifePlan): number {
    if (!plan.tasks.length) return 0
    const done = plan.tasks.filter((task) => task.completed).length
    return Math.round((done / plan.tasks.length) * 100)
  }

  return {
    plans,
    currentPlan,
    planning,
    agentStatuses,
    generatePlan,
    selectPlan,
    toggleTask,
    updateNote,
    setStatus,
    deletePlan,
    exportAllRecords,
    exportSingleRecord,
    importRecords,
    taskProgress,
  }
}
