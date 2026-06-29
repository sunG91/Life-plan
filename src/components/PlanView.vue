<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { renderMarkdown } from '../services/export'
import type { LifePlan } from '../types'
import AgentStatusBar from './AgentStatusBar.vue'
import TimelineView from './TimelineView.vue'
import TaskListView from './TaskListView.vue'
import DocumentView from './DocumentView.vue'

const props = defineProps<{
  plan: LifePlan | null
  plans: LifePlan[]
  planning: boolean
  agentStatuses: import('../types').AgentStatus[]
}>()

const emit = defineEmits<{
  generate: [goal: string]
  select: [plan: LifePlan]
  toggleTask: [planId: string, taskId: string]
  delete: [planId: string]
}>()

const goalInput = ref('')
const activeTab = ref<'overview' | 'timeline' | 'tasks' | 'document'>('overview')
const progressEnd = ref<HTMLElement>()

const tabs = [
  { key: 'overview' as const, label: '总览' },
  { key: 'timeline' as const, label: '时间轴' },
  { key: 'tasks' as const, label: '任务清单' },
  { key: 'document' as const, label: '规划文档' },
]

const overviewHtml = computed(() =>
  props.plan ? renderMarkdown(props.plan.overview) : '',
)

const progressOverviewHtml = computed(() =>
  props.plan?.overview ? renderMarkdown(props.plan.overview) : '',
)

const progressDocumentHtml = computed(() =>
  props.plan?.document ? renderMarkdown(props.plan.document) : '',
)

const completedCount = computed(() =>
  props.plan?.tasks.filter((t) => t.completed).length ?? 0,
)

watch(
  () => [
    props.plan?.motivation,
    props.plan?.overview,
    props.plan?.timeline.length,
    props.plan?.tasks.length,
    props.plan?.document,
  ],
  async () => {
    if (!props.planning) return
    await nextTick()
    progressEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  },
)

function handleGenerate() {
  if (!goalInput.value.trim()) return
  emit('generate', goalInput.value.trim())
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleToggleTask(taskId: string) {
  if (props.plan) emit('toggleTask', props.plan.id, taskId)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="shrink-0 mb-4">
      <div class="flex gap-2">
        <input
          v-model="goalInput"
          type="text"
          placeholder="输入你的人生目标，如：三年内成为产品经理"
          class="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
          @keydown.enter="handleGenerate"
        />
        <button
          class="shrink-0 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
          :disabled="planning || !goalInput.trim()"
          @click="handleGenerate"
        >
          {{ planning ? '规划中...' : '生成规划' }}
        </button>
      </div>
      <AgentStatusBar :statuses="agentStatuses" :planning="planning" />
    </div>

    <div v-if="plans.length > 1" class="shrink-0 mb-4 flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="p in plans"
        :key="p.id"
        class="shrink-0 px-3 py-1.5 text-xs rounded-full transition-colors"
        :class="plan?.id === p.id
          ? 'bg-indigo-600 text-white'
          : 'bg-white/80 text-slate-600 hover:bg-white'"
        @click="emit('select', p)"
      >
        {{ p.goal.slice(0, 12) }}{{ p.goal.length > 12 ? '...' : '' }}
      </button>
    </div>

    <div v-if="!plan && !planning" class="flex-1 flex items-center justify-center">
      <div class="text-center py-12">
        <div class="text-4xl mb-3">🧭</div>
        <p class="text-sm text-slate-500">输入目标，多智能体将协同为你生成完整规划</p>
      </div>
    </div>

    <div v-else-if="plan" class="flex-1 overflow-hidden flex flex-col min-h-0">
      <div v-if="planning" class="flex-1 overflow-y-auto min-h-0 pb-4 space-y-4">
        <div class="rounded-xl bg-white/75 p-4 border border-slate-100 animate-slide-up">
          <p class="text-xs font-medium text-slate-400 mb-1">正在生成</p>
          <h2 class="text-base font-semibold text-slate-800">{{ plan.goal }}</h2>
        </div>

        <section v-if="plan.motivation" class="rounded-xl bg-amber-50/80 p-4 border border-amber-100 animate-slide-up">
          <p class="text-xs font-semibold text-amber-600 mb-2">初心守护者已完成</p>
          <p class="text-sm text-slate-700 leading-relaxed italic">{{ plan.motivation }}</p>
        </section>

        <section v-if="plan.overview" class="rounded-xl bg-white/80 p-4 border border-slate-100 animate-slide-up">
          <p class="text-xs font-semibold text-indigo-600 mb-2">路径规划师正在输出</p>
          <div class="markdown-body text-sm" v-html="progressOverviewHtml" />
        </section>

        <section v-if="plan.timeline.length" class="rounded-xl bg-white/80 p-4 border border-slate-100 animate-slide-up">
          <p class="text-xs font-semibold text-violet-600 mb-3">时间轴编排师已完成</p>
          <TimelineView :phases="plan.timeline" />
        </section>

        <section v-if="plan.tasks.length" class="rounded-xl bg-white/80 p-4 border border-slate-100 animate-slide-up">
          <p class="text-xs font-semibold text-emerald-600 mb-3">任务拆解师已完成</p>
          <TaskListView :tasks="plan.tasks" :plan-id="plan.id" @toggle="handleToggleTask" />
        </section>

        <section v-if="plan.document" class="rounded-xl bg-white/80 p-4 border border-slate-100 animate-slide-up">
          <p class="text-xs font-semibold text-sky-600 mb-2">文档撰写师正在输出</p>
          <div class="markdown-body text-sm" v-html="progressDocumentHtml" />
        </section>

        <div ref="progressEnd" />
      </div>

      <template v-else>
        <div class="shrink-0 mb-4 p-4 bg-gradient-to-r from-amber-50 to-indigo-50 rounded-xl border border-amber-100/50">
          <p class="text-sm text-slate-700 leading-relaxed italic">"{{ plan.motivation }}"</p>
        </div>

        <div class="shrink-0 flex gap-1 mb-4 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="shrink-0 px-4 py-2 text-sm rounded-lg transition-colors"
            :class="activeTab === tab.key
              ? 'bg-white text-indigo-600 font-medium shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.key === 'tasks' && plan.tasks.length" class="ml-1 text-xs text-slate-400">
              {{ completedCount }}/{{ plan.tasks.length }}
            </span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto min-h-0 pb-4">
          <div v-show="activeTab === 'overview'">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-base font-semibold text-slate-800">{{ plan.goal }}</h2>
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400">{{ formatDate(plan.createdAt) }}</span>
                <button
                  class="text-xs text-red-400 hover:text-red-500"
                  @click="emit('delete', plan.id)"
                >
                  删除
                </button>
              </div>
            </div>
            <div class="markdown-body text-sm" v-html="overviewHtml" />
          </div>

          <TimelineView v-show="activeTab === 'timeline'" :phases="plan.timeline" />
          <TaskListView
            v-show="activeTab === 'tasks'"
            :tasks="plan.tasks"
            :plan-id="plan.id"
            @toggle="handleToggleTask"
          />
          <DocumentView
            v-show="activeTab === 'document'"
            :content="plan.document"
            :goal="plan.goal"
          />
        </div>
      </template>
    </div>
  </div>
</template>
