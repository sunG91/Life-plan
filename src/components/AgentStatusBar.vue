<script setup lang="ts">
import type { AgentStatus } from '../types'
import { AGENT_META } from '../agents/prompts'

defineProps<{
  statuses: AgentStatus[]
  planning: boolean
}>()

const statusIcon: Record<string, string> = {
  idle: '○',
  running: '●',
  done: '✓',
  error: '!',
}

const statusColor: Record<string, string> = {
  idle: 'text-slate-300',
  running: 'text-indigo-500 animate-pulse-soft',
  done: 'text-emerald-500',
  error: 'text-red-400',
}
</script>

<template>
  <div v-if="planning || statuses.some(s => s.status !== 'idle')" class="mb-4 animate-slide-up">
    <p class="text-xs text-slate-500 mb-2 font-medium">智能体协同工作中...</p>
    <div class="flex flex-wrap gap-2">
      <div
        v-for="s in statuses"
        :key="s.role"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-full text-xs"
        :class="statusColor[s.status]"
      >
        <span>{{ AGENT_META[s.role]?.icon }}</span>
        <span class="text-slate-600">{{ s.name }}</span>
        <span class="font-mono">{{ statusIcon[s.status] }}</span>
      </div>
    </div>
  </div>
</template>
