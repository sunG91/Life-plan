import { ref } from 'vue'
import { orchestratePlan } from '../agents/orchestrator'
import {
  canResumePlan,
  downloadJson,
  exportPlanRecords,
  loadPlans,
  normalizeInterruptedPlans,
  normalizePlan,
  parseImportedRecords,
  savePlans,
} from '../services/storage'
import { isPlanComplete } from '../services/planState'
import { useSettings } from './useSettings'
import type { AgentStatus, LifePlan, PlanStatus } from '../types'

const rawLoaded = loadPlans()
const initialPlans = normalizeInterruptedPlans(rawLoaded)
if (initialPlans.some((_, i) => rawLoaded[i]?.generationState === 'generating')) {
  savePlans(initialPlans)
}

const plans = ref<LifePlan[]>(initialPlans)
const currentPlan = ref<LifePlan | null>(plans.value[0] ?? null)
const planning = ref(false)
const agentStatuses = ref<AgentStatus[]>([])

let persistTimer: ReturnType<typeof setTimeout> | null = null

function touchPlan(plan: LifePlan): LifePlan {
  return { ...plan, updatedAt: Date.now() }
}

function persistPlans(immediate = false) {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }

  const write = () => {
    savePlans(plans.value)
  }

  if (immediate) {
    write()
    return
  }

  persistTimer = setTimeout(write, 500)
}

function upsertPlan(plan: LifePlan, immediate = false) {
  const normalized = normalizePlan(plan)
  const index = plans.value.findIndex((p) => p.id === normalized.id)
  if (index >= 0) {
    plans.value[index] = normalized
    plans.value = [...plans.value]
  } else {
    plans.value = [normalized, ...plans.value]
  }
  if (currentPlan.value?.id === normalized.id) {
    currentPlan.value = { ...normalized }
  }
  persistPlans(immediate)
}

function syncCurrent(planId: string, updater: (plan: LifePlan) => LifePlan) {
  const index = plans.value.findIndex((p) => p.id === planId)
  if (index < 0) return
  const next = updater(plans.value[index])
  plans.value[index] = next
  plans.value = [...plans.value]
  if (currentPlan.value?.id === planId) {
    currentPlan.value = { ...next }
  }
  persistPlans(true)
}

export function usePlan() {
  const { settings } = useSettings()

  async function runOrchestration(plan: LifePlan, isResume: boolean): Promise<LifePlan | null> {
    const targetId = plan.id
    planning.value = true
    if (!isResume) agentStatuses.value = []

    const working = normalizePlan({
      ...plan,
      generationState: 'generating',
      updatedAt: Date.now(),
    })

    // 会话内累积状态，避免并发智能体互相覆盖，也避免切换 currentPlan 时写错档案
    let sessionPlan = working

    const applyPatch = (patch: Partial<LifePlan>) => {
      sessionPlan = normalizePlan({
        ...sessionPlan,
        ...patch,
        id: targetId,
        goal: plan.goal,
        createdAt: plan.createdAt,
        note: plan.note,
        status: plan.status,
        generationState: 'generating',
        updatedAt: Date.now(),
      })
      upsertPlan(sessionPlan)
      if (currentPlan.value?.id === targetId) {
        currentPlan.value = { ...sessionPlan }
      }
    }

    currentPlan.value = working
    upsertPlan(working, true)

    try {
      const result = await orchestratePlan(
        settings.value,
        plan.goal,
        (statuses) => {
          agentStatuses.value = statuses
        },
        applyPatch,
        isResume ? sessionPlan : undefined,
      )

      const finalPlan = normalizePlan({
        ...result,
        id: targetId,
        goal: plan.goal,
        createdAt: plan.createdAt,
        updatedAt: Date.now(),
        note: plan.note,
        status: plan.status,
        generationState: 'completed',
      })

      sessionPlan = finalPlan
      if (currentPlan.value?.id === targetId) {
        currentPlan.value = finalPlan
      }
      upsertPlan(finalPlan, true)
      return finalPlan
    } catch (err) {
      const partial = normalizePlan({
        ...sessionPlan,
        generationState: 'interrupted',
        updatedAt: Date.now(),
      })
      sessionPlan = partial
      if (currentPlan.value?.id === targetId) {
        currentPlan.value = partial
      }
      upsertPlan(partial, true)
      throw err
    } finally {
      planning.value = false
    }
  }

  async function generatePlan(goal: string): Promise<LifePlan | null> {
    if (!goal.trim() || planning.value) return null

    const now = Date.now()
    const draft = normalizePlan({
      id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
      goal: goal.trim(),
      createdAt: now,
      updatedAt: now,
      status: 'active',
      generationState: 'generating',
      completedAgents: [],
    })

    return runOrchestration(draft, false)
  }

  async function resumePlan(planId?: string): Promise<LifePlan | null> {
    if (planning.value) return null

    const target = planId
      ? plans.value.find((p) => p.id === planId)
      : currentPlan.value

    if (!target || !canResumePlan(target)) return null

    return runOrchestration(target, true)
  }

  function selectPlan(plan: LifePlan) {
    if (planning.value) return
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
    persistPlans(true)
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
    persistPlans(true)
    return imported.length
  }

  function reloadPlans() {
    plans.value = normalizeInterruptedPlans(loadPlans())
    if (currentPlan.value) {
      const latest = plans.value.find((p) => p.id === currentPlan.value!.id)
      currentPlan.value = latest ?? plans.value[0] ?? null
    } else {
      currentPlan.value = plans.value[0] ?? null
    }
  }

  function taskProgress(plan: LifePlan): number {
    if (!plan.tasks.length) return 0
    const done = plan.tasks.filter((task) => task.completed).length
    return Math.round((done / plan.tasks.length) * 100)
  }

  function interruptedPlans() {
    return plans.value.filter((p) => canResumePlan(p))
  }

  return {
    plans,
    currentPlan,
    planning,
    agentStatuses,
    generatePlan,
    resumePlan,
    selectPlan,
    toggleTask,
    updateNote,
    setStatus,
    deletePlan,
    exportAllRecords,
    exportSingleRecord,
    importRecords,
    taskProgress,
    reloadPlans,
    interruptedPlans,
    canResumePlan,
    isPlanComplete,
  }
}
