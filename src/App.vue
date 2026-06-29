<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppHeader from './components/AppHeader.vue'
import SettingsModal from './components/SettingsModal.vue'
import ChatView from './components/ChatView.vue'
import PlanView from './components/PlanView.vue'
import RecordsView from './components/RecordsView.vue'
import { useSettings } from './composables/useSettings'
import { usePlan } from './composables/usePlan'
import type { LifePlan } from './types'

const { configured } = useSettings()
const {
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
} = usePlan()

const showSettings = ref(false)
const activeView = ref<'chat' | 'plan' | 'records'>('chat')
const toast = ref('')

function showToast(message: string, duration = 3000) {
  toast.value = message
  setTimeout(() => (toast.value = ''), duration)
}

function openSettings() {
  showSettings.value = true
}

async function handleGeneratePlan(goal: string) {
  if (!configured.value) {
    showToast('请先配置豆包 API Key')
    showSettings.value = true
    return
  }

  activeView.value = 'plan'
  try {
    await generatePlan(goal)
    showToast('规划已生成并保存到本地档案')
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : '规划生成中断，可点击「继续生成」从断点续传',
      5000,
    )
  }
}

async function handleResumePlan(planId: string) {
  if (!configured.value) {
    showToast('请先配置豆包 API Key')
    showSettings.value = true
    return
  }

  activeView.value = 'plan'
  try {
    await resumePlan(planId)
    showToast('规划已续传完成并保存')
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : '续传中断，可再次点击「继续生成」',
      5000,
    )
  }
}

onMounted(() => {
  const pending = interruptedPlans()
  if (pending.length) {
    showToast(`有 ${pending.length} 份规划未完成，可点击「继续生成」续传`, 5000)
  }
})

function handleDelete(planId: string) {
  if (confirm('确定删除这份规划档案吗？此操作不可恢复。')) {
    deletePlan(planId)
    showToast('档案已删除')
  }
}

function openPlanFromRecords(plan: LifePlan) {
  selectPlan(plan)
  activeView.value = 'plan'
}

async function handleImport(file: File, mode: 'merge' | 'replace') {
  if (mode === 'replace' && !confirm('覆盖导入将替换所有本地档案，是否继续？')) {
    return
  }
  try {
    const count = await importRecords(file, mode)
    showToast(`成功导入 ${count} 条档案记录`)
  } catch (err) {
    showToast(err instanceof Error ? err.message : '导入失败', 5000)
  }
}
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <AppHeader :show-settings="showSettings" @open-settings="openSettings" />

    <div
      v-if="!configured"
      class="bg-amber-50 border-b border-amber-100 px-4 py-2 text-center"
    >
      <button class="text-sm text-amber-700 hover:text-amber-800" @click="openSettings">
        请先配置豆包 API Key 以开始使用 →
      </button>
    </div>

    <Transition name="fade">
      <div
        v-if="toast"
        class="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] px-4 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg"
      >
        {{ toast }}
      </div>
    </Transition>

    <main class="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col min-h-0">
      <nav class="shrink-0 flex gap-1 mb-4 p-1 bg-white/60 rounded-xl w-fit max-w-full overflow-x-auto">
        <button
          class="shrink-0 px-4 sm:px-5 py-2 text-sm rounded-lg transition-all"
          :class="activeView === 'chat'
            ? 'bg-white text-indigo-600 font-medium shadow-sm'
            : 'text-slate-500 hover:text-slate-700'"
          @click="activeView = 'chat'"
        >
          对话
        </button>
        <button
          class="shrink-0 px-4 sm:px-5 py-2 text-sm rounded-lg transition-all"
          :class="activeView === 'plan'
            ? 'bg-white text-indigo-600 font-medium shadow-sm'
            : 'text-slate-500 hover:text-slate-700'"
          @click="activeView = 'plan'"
        >
          规划
          <span v-if="currentPlan" class="ml-1 text-xs opacity-60">·</span>
        </button>
        <button
          class="shrink-0 px-4 sm:px-5 py-2 text-sm rounded-lg transition-all"
          :class="activeView === 'records'
            ? 'bg-white text-indigo-600 font-medium shadow-sm'
            : 'text-slate-500 hover:text-slate-700'"
          @click="activeView = 'records'; reloadPlans()"
        >
          档案
          <span v-if="plans.length" class="ml-1 text-xs opacity-60">{{ plans.length }}</span>
        </button>
      </nav>

      <div class="flex-1 min-h-0 bg-white/40 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
        <ChatView
          v-show="activeView === 'chat'"
          class="h-full"
          @generate-plan="handleGeneratePlan"
        />
        <PlanView
          v-show="activeView === 'plan'"
          class="h-full"
          :plan="currentPlan"
          :plans="plans"
          :planning="planning"
          :agent-statuses="agentStatuses"
          @generate="handleGeneratePlan"
          @resume="handleResumePlan"
          @select="selectPlan"
          @toggle-task="toggleTask"
          @delete="handleDelete"
        />
        <RecordsView
          v-show="activeView === 'records'"
          class="h-full"
          :plans="plans"
          :current-plan-id="currentPlan?.id"
          :task-progress="taskProgress"
          @open="openPlanFromRecords"
          @delete="handleDelete"
          @update-note="updateNote"
          @set-status="setStatus"
          @export-all="exportAllRecords"
          @export-one="exportSingleRecord"
          @import="handleImport"
        />
      </div>
    </main>

    <footer class="shrink-0 py-3 text-center text-xs text-slate-400 space-y-1">
      <p>人生充满不确定性，但你拥有无限种可能。</p>
      <p>
        <a href="https://www.ddup.pro" target="_blank" rel="noopener" class="hover:text-indigo-500 transition-colors">孙瑞</a>
        · sunr20050503@163.com
      </p>
    </footer>

    <SettingsModal :open="showSettings" @close="showSettings = false" />
  </div>
</template>
