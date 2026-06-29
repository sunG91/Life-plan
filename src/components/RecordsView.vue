<script setup lang="ts">
import { computed, ref } from 'vue'
import { canResumePlan } from '../services/storage'
import type { LifePlan, PlanStatus } from '../types'

const props = defineProps<{
  plans: LifePlan[]
  currentPlanId?: string | null
  taskProgress: (plan: LifePlan) => number
}>()

const emit = defineEmits<{
  open: [plan: LifePlan]
  delete: [planId: string]
  updateNote: [planId: string, note: string]
  setStatus: [planId: string, status: PlanStatus]
  exportAll: []
  exportOne: [planId: string]
  import: [file: File, mode: 'merge' | 'replace']
}>()

const search = ref('')
const statusFilter = ref<'all' | PlanStatus>('all')
const editingNoteId = ref<string | null>(null)
const noteDraft = ref('')
const importMode = ref<'merge' | 'replace'>('merge')
const fileInput = ref<HTMLInputElement>()

const filteredPlans = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return props.plans
    .filter((plan) => {
      if (statusFilter.value !== 'all' && plan.status !== statusFilter.value) return false
      if (!keyword) return true
      return (
        plan.goal.toLowerCase().includes(keyword)
        || plan.note.toLowerCase().includes(keyword)
        || plan.overview.toLowerCase().includes(keyword)
      )
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
})

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function startEditNote(plan: LifePlan) {
  editingNoteId.value = plan.id
  noteDraft.value = plan.note
}

function saveNote(planId: string) {
  emit('updateNote', planId, noteDraft.value.trim())
  editingNoteId.value = null
  noteDraft.value = ''
}

function cancelEditNote() {
  editingNoteId.value = null
  noteDraft.value = ''
}

function triggerImport() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  emit('import', file, importMode.value)
  input.value = ''
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="shrink-0 mb-4 space-y-3">
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="search"
          type="search"
          placeholder="搜索目标、备注或规划内容..."
          class="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
        />
        <select
          v-model="statusFilter"
          class="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <option value="all">全部状态</option>
          <option value="active">进行中</option>
          <option value="archived">已归档</option>
        </select>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          class="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
          :disabled="!plans.length"
          @click="emit('exportAll')"
        >
          导出全部档案
        </button>
        <select
          v-model="importMode"
          class="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-600"
        >
          <option value="merge">导入：合并</option>
          <option value="replace">导入：覆盖</option>
        </select>
        <button
          class="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
          @click="triggerImport"
        >
          导入备份
        </button>
        <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFileChange" />
        <span class="text-xs text-slate-400 ml-auto">共 {{ plans.length }} 条本地记录</span>
      </div>
    </div>

    <div v-if="!filteredPlans.length" class="flex-1 flex items-center justify-center">
      <div class="text-center py-12 px-6">
        <div class="text-4xl mb-3">📁</div>
        <p class="text-sm text-slate-600 mb-1">
          {{ plans.length ? '没有匹配的档案记录' : '还没有本地职业规划档案' }}
        </p>
        <p class="text-xs text-slate-400">
          生成规划后会自动保存在浏览器本地，可在此查看、备注与备份。
        </p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto min-h-0 space-y-3 pb-2">
      <article
        v-for="plan in filteredPlans"
        :key="plan.id"
        class="rounded-xl bg-white/80 p-4 sm:p-5 transition-shadow hover:shadow-sm"
        :class="currentPlanId === plan.id ? 'ring-2 ring-indigo-200' : ''"
      >
        <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <h3 class="text-sm sm:text-base font-semibold text-slate-800 truncate">{{ plan.goal }}</h3>
              <span
                v-if="canResumePlan(plan)"
                class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700"
              >
                未完成
              </span>
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="plan.status === 'archived'
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-emerald-50 text-emerald-600'"
              >
                {{ plan.status === 'archived' ? '已归档' : '进行中' }}
              </span>
            </div>
            <p class="text-xs text-slate-400">
              创建 {{ formatDate(plan.createdAt) }}
              <span v-if="plan.updatedAt !== plan.createdAt"> · 更新 {{ formatDate(plan.updatedAt) }}</span>
            </p>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <button
              class="px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              @click="emit('open', plan)"
            >
              查看
            </button>
            <button
              class="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              @click="emit('exportOne', plan.id)"
            >
              导出
            </button>
            <button
              class="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              @click="emit('setStatus', plan.id, plan.status === 'archived' ? 'active' : 'archived')"
            >
              {{ plan.status === 'archived' ? '恢复' : '归档' }}
            </button>
            <button
              class="px-2.5 py-1 text-xs text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              @click="emit('delete', plan.id)"
            >
              删除
            </button>
          </div>
        </div>

        <div v-if="plan.tasks.length" class="mb-3">
          <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>任务进度</span>
            <span>{{ taskProgress(plan) }}%</span>
          </div>
          <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
              :style="{ width: `${taskProgress(plan)}%` }"
            />
          </div>
        </div>

        <p v-if="plan.motivation" class="text-xs text-slate-500 italic line-clamp-2 mb-3">
          “{{ plan.motivation }}”
        </p>

        <div class="flex flex-wrap gap-2 text-[11px] text-slate-400 mb-3">
          <span>{{ plan.timeline.length }} 个阶段</span>
          <span>{{ plan.tasks.length }} 项任务</span>
          <span v-if="plan.document">含规划文档</span>
        </div>

        <div class="border-t border-slate-100 pt-3">
          <p class="text-xs font-medium text-slate-500 mb-2">我的备注</p>
          <div v-if="editingNoteId === plan.id" class="space-y-2">
            <textarea
              v-model="noteDraft"
              rows="2"
              placeholder="记录你的想法、进展或下一步打算..."
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <div class="flex gap-2">
              <button
                class="px-3 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                @click="saveNote(plan.id)"
              >
                保存
              </button>
              <button
                class="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                @click="cancelEditNote"
              >
                取消
              </button>
            </div>
          </div>
          <div v-else class="flex items-start justify-between gap-2">
            <p class="text-sm text-slate-600 flex-1" :class="{ 'text-slate-400 italic': !plan.note }">
              {{ plan.note || '暂无备注，点击编辑记录你的想法' }}
            </p>
            <button
              class="shrink-0 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg"
              @click="startEditNote(plan)"
            >
              编辑
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
