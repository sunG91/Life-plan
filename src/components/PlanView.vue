<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { renderMarkdown } from '../services/export'
import { canResumePlan } from '../services/storage'
import type { AgentRole, LifePlan } from '../types'
import AgentStatusBar from './AgentStatusBar.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import TabLoadingPanel from './TabLoadingPanel.vue'
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
  resume: [planId: string]
  select: [plan: LifePlan]
  toggleTask: [planId: string, taskId: string]
  delete: [planId: string]
}>()

const goalInput = ref('')
const activeTab = ref<'overview' | 'timeline' | 'tasks' | 'document'>('overview')
const contentScroll = ref<HTMLElement>()

const tabs = [
  { key: 'overview' as const, label: '总览', role: 'planner' as AgentRole },
  { key: 'timeline' as const, label: '时间轴', role: 'timeline' as AgentRole },
  { key: 'tasks' as const, label: '任务清单', role: 'tasks' as AgentRole },
  { key: 'document' as const, label: '规划文档', role: 'document' as AgentRole },
]

const overviewHtml = computed(() =>
  props.plan ? renderMarkdown(props.plan.overview) : '',
)

const documentHtml = computed(() =>
  props.plan?.document ? renderMarkdown(props.plan.document) : '',
)

const completedCount = computed(() =>
  props.plan?.tasks.filter((t) => t.completed).length ?? 0,
)

const isIncomplete = computed(() =>
  props.plan ? canResumePlan(props.plan) : false,
)

const missingAgents = computed(() => {
  if (!props.plan) return []
  const names: Record<string, string> = {
    motivation: '初心守护者',
    planner: '路径规划师',
    timeline: '时间轴编排师',
    tasks: '任务拆解师',
    document: '文档撰写师',
  }
  const all = ['motivation', 'planner', 'timeline', 'tasks', 'document'] as const
  return all
    .filter((role) => !props.plan!.completedAgents.includes(role))
    .map((role) => names[role])
})

function getAgentStatus(role: AgentRole): 'idle' | 'running' | 'done' | 'error' {
  return props.agentStatuses.find((s) => s.role === role)?.status ?? 'idle'
}

const plannerDone = computed(() =>
  getAgentStatus('planner') === 'done' || !!props.plan?.overview?.trim(),
)

function isTabLoading(role: AgentRole): boolean {
  if (!props.planning) return false
  const status = getAgentStatus(role)
  if (status === 'running') return true
  if (role !== 'planner' && !plannerDone.value && status === 'idle') return true
  return false
}

function tabLoadingHint(role: AgentRole): string {
  const hints: Record<AgentRole, string> = {
    motivation: '初心守护者正在撰写励志开场...',
    planner: '路径规划师正在制定路线规划...',
    timeline: plannerDone.value ? '时间轴编排师正在编排阶段...' : '等待路径规划师完成后启动...',
    tasks: plannerDone.value ? '任务拆解师正在拆解任务...' : '等待路径规划师完成后启动...',
    document: plannerDone.value ? '文档撰写师正在撰写规划文档...' : '等待路径规划师完成后启动...',
    orchestrator: '',
  }
  return hints[role]
}

function scrollContentToBottom() {
  requestAnimationFrame(() => {
    const container = contentScroll.value
    if (!container) return
    container.scrollTop = container.scrollHeight
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  })
}

watch(
  () => [
    props.planning,
    activeTab.value,
    props.agentStatuses,
    props.plan?.motivation,
    props.plan?.overview,
    props.plan?.document,
    props.plan?.timeline.length,
    props.plan?.tasks.length,
    overviewHtml.value,
    documentHtml.value,
  ],
  async () => {
    if (!props.planning) return
    await nextTick()
    scrollContentToBottom()
  },
  { flush: 'post' },
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

function handleResume() {
  if (props.plan) emit('resume', props.plan.id)
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
          class="shrink-0 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all shadow-sm inline-flex items-center gap-2"
          :disabled="planning || !goalInput.trim()"
          @click="handleGenerate"
        >
          <LoadingSpinner v-if="planning" size="xs" color="white" />
          {{ planning ? '规划中...' : '生成规划' }}
        </button>
      </div>
      <AgentStatusBar :statuses="agentStatuses" :planning="planning" />
    </div>

    <div v-if="plans.length > 1" class="shrink-0 mb-4 flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="p in plans"
        :key="p.id"
        class="shrink-0 px-3 py-1.5 text-xs rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        :class="plan?.id === p.id
          ? 'bg-indigo-600 text-white'
          : 'bg-white/80 text-slate-600 hover:bg-white'"
        :disabled="planning"
        :title="planning ? '生成中无法切换，请等待完成' : undefined"
        @click="emit('select', p)"
      >
        <span
          v-if="canResumePlan(p)"
          class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1"
          title="未完成"
        />
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
      <div
        v-if="isIncomplete && !planning"
        class="shrink-0 mb-4 p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-amber-800">规划尚未完成</p>
          <p class="text-xs text-amber-700 mt-1">
            已完成 {{ plan.completedAgents.length }}/5 个智能体
            <span v-if="missingAgents.length">，待续：{{ missingAgents.join('、') }}</span>
          </p>
        </div>
        <button
          class="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
          :disabled="planning"
          @click="handleResume"
        >
          <LoadingSpinner v-if="planning" size="xs" color="white" />
          继续生成
        </button>
      </div>

      <div
        v-if="plan.motivation || (planning && getAgentStatus('motivation') !== 'idle')"
        class="shrink-0 mb-4 p-4 bg-gradient-to-r from-amber-50 to-indigo-50 rounded-xl border border-amber-100/50"
      >
        <p v-if="plan.motivation" class="text-sm text-slate-700 leading-relaxed italic">
          "{{ plan.motivation }}"
          <span
            v-if="planning && getAgentStatus('motivation') === 'running'"
            class="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle animate-pulse-soft"
          />
        </p>
        <TabLoadingPanel
          v-else-if="planning"
          hint="初心守护者正在撰写励志开场..."
          class="!py-4"
        />
      </div>

      <div class="shrink-0 flex gap-1 mb-4 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="shrink-0 px-4 py-2 text-sm rounded-lg transition-colors inline-flex items-center gap-1.5"
          :class="activeTab === tab.key
            ? 'bg-white text-indigo-600 font-medium shadow-sm'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <LoadingSpinner v-if="isTabLoading(tab.role)" size="xs" />
          <span v-else-if="planning && getAgentStatus(tab.role) === 'done'" class="text-emerald-500 text-xs">✓</span>
          <span v-if="tab.key === 'tasks' && plan.tasks.length" class="text-xs text-slate-400">
            {{ completedCount }}/{{ plan.tasks.length }}
          </span>
        </button>
      </div>

      <div ref="contentScroll" class="flex-1 overflow-y-auto min-h-0 pb-4">
        <div v-show="activeTab === 'overview'">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-base font-semibold text-slate-800">{{ plan.goal }}</h2>
            <div class="flex items-center gap-2">
              <span
                v-if="isIncomplete && !planning"
                class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"
              >
                未完成
              </span>
              <span v-if="planning && isTabLoading('planner')" class="text-xs text-indigo-500 inline-flex items-center gap-1">
                <LoadingSpinner size="xs" />
                生成中
              </span>
              <span class="text-xs text-slate-400">{{ formatDate(plan.createdAt) }}</span>
              <button
                v-if="!planning"
                class="text-xs text-red-400 hover:text-red-500"
                @click="emit('delete', plan.id)"
              >
                删除
              </button>
            </div>
          </div>
          <div v-if="plan.overview" class="relative">
            <div class="markdown-body text-sm" v-html="overviewHtml" />
            <span
              v-if="planning && getAgentStatus('planner') === 'running'"
              class="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle animate-pulse-soft"
            />
          </div>
          <TabLoadingPanel
            v-else-if="planning && isTabLoading('planner')"
            :hint="tabLoadingHint('planner')"
          />
          <p v-else class="text-sm text-slate-400 italic">路径规划尚未生成，点击「继续生成」补全内容。</p>
        </div>

        <div v-show="activeTab === 'timeline'">
          <TimelineView v-if="plan.timeline.length" :phases="plan.timeline" />
          <TabLoadingPanel
            v-else-if="planning && isTabLoading('timeline')"
            :hint="tabLoadingHint('timeline')"
          />
          <p v-else class="text-sm text-slate-400 italic py-8 text-center">时间轴尚未生成</p>
        </div>

        <div v-show="activeTab === 'tasks'">
          <TaskListView
            v-if="plan.tasks.length"
            :tasks="plan.tasks"
            :plan-id="plan.id"
            @toggle="handleToggleTask"
          />
          <TabLoadingPanel
            v-else-if="planning && isTabLoading('tasks')"
            :hint="tabLoadingHint('tasks')"
          />
          <p v-else class="text-sm text-slate-400 italic py-8 text-center">任务清单尚未生成</p>
        </div>

        <div v-show="activeTab === 'document'">
          <template v-if="plan.document && planning">
            <div class="relative">
              <div class="markdown-body text-sm" v-html="documentHtml" />
              <span
                v-if="getAgentStatus('document') === 'running'"
                class="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle animate-pulse-soft"
              />
            </div>
          </template>
          <DocumentView
            v-else-if="plan.document || (!planning && !isIncomplete)"
            :content="plan.document || plan.overview"
            :goal="plan.goal"
          />
          <TabLoadingPanel
            v-else-if="planning && isTabLoading('document')"
            :hint="tabLoadingHint('document')"
          />
          <p v-else class="text-sm text-slate-400 italic py-8 text-center">规划文档尚未生成</p>
        </div>
      </div>
    </div>
  </div>
</template>
