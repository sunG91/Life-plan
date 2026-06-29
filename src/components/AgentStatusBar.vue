<script setup lang="ts">
import type { AgentStatus } from '../types'
import { AGENT_META } from '../agents/prompts'
import LoadingSpinner from './LoadingSpinner.vue'

defineProps<{
  statuses: AgentStatus[]
  planning: boolean
}>()

const statusIcon: Record<string, string> = {
  idle: '○',
  running: '',
  done: '✓',
  error: '!',
}

const chipClass: Record<string, string> = {
  idle: 'bg-slate-50 text-slate-400 border-slate-100',
  running: 'bg-indigo-50 text-indigo-600 border-indigo-200 agent-step-running-indigo',
  done: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  error: 'bg-red-50 text-red-500 border-red-100',
}
</script>

<template>
  <div v-if="planning || statuses.some(s => s.status !== 'idle')" class="mb-4 animate-slide-up">
    <div class="flex items-center gap-2 mb-2">
      <LoadingSpinner v-if="planning" size="xs" />
      <p class="text-xs text-slate-500 font-medium">
        智能体并发协同中（无依赖任务并行执行）...
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <div
        v-for="s in statuses"
        :key="s.role"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all"
        :class="chipClass[s.status]"
      >
        <LoadingSpinner v-if="s.status === 'running'" size="xs" />
        <span v-else>{{ AGENT_META[s.role]?.icon }}</span>
        <span>{{ s.name }}</span>
        <span v-if="s.status !== 'running'" class="font-mono text-[10px]">{{ statusIcon[s.status] }}</span>
      </div>
    </div>
  </div>
</template>
