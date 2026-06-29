<script setup lang="ts">
import type { TaskItem } from '../types'

const props = defineProps<{
  tasks: TaskItem[]
  planId: string
}>()

const emit = defineEmits<{
  toggle: [taskId: string]
}>()

const priorityLabel: Record<string, { text: string; class: string }> = {
  high: { text: '高', class: 'bg-red-100 text-red-600' },
  medium: { text: '中', class: 'bg-amber-100 text-amber-600' },
  low: { text: '低', class: 'bg-slate-100 text-slate-500' },
}

const sorted = () =>
  [...props.tasks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })
</script>

<template>
  <div v-if="tasks.length" class="space-y-2">
    <div
      v-for="task in sorted()"
      :key="task.id"
      class="flex items-start gap-3 p-3 sm:p-4 bg-white/70 rounded-xl transition-opacity"
      :class="{ 'opacity-50': task.completed }"
    >
      <button
        class="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
        :class="task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-400'"
        @click="emit('toggle', task.id)"
      >
        <svg v-if="task.completed" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </button>

      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2 mb-0.5">
          <span class="text-sm font-medium text-slate-800" :class="{ 'line-through': task.completed }">
            {{ task.title }}
          </span>
          <span
            class="text-[10px] px-1.5 py-0.5 rounded font-medium"
            :class="priorityLabel[task.priority]?.class"
          >
            {{ priorityLabel[task.priority]?.text }}
          </span>
          <span v-if="task.phase" class="text-[10px] text-violet-500">{{ task.phase }}</span>
        </div>
        <p class="text-xs text-slate-500 leading-relaxed">{{ task.description }}</p>
        <p v-if="task.deadline" class="text-[11px] text-slate-400 mt-1">建议完成：{{ task.deadline }}</p>
      </div>
    </div>
  </div>

  <p v-else class="text-sm text-slate-400 text-center py-8">暂无任务清单</p>
</template>
