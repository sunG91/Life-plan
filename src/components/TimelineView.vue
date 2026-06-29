<script setup lang="ts">
import type { TimelinePhase } from '../types'

defineProps<{
  phases: TimelinePhase[]
}>()
</script>

<template>
  <div v-if="phases.length" class="relative pl-6 sm:pl-8">
    <div class="absolute left-2 sm:left-3 top-2 bottom-2 w-px bg-gradient-to-b from-indigo-300 via-violet-300 to-amber-300" />

    <div
      v-for="(phase, i) in phases"
      :key="phase.id"
      class="relative mb-6 last:mb-0 animate-slide-up"
      :style="{ animationDelay: `${i * 80}ms` }"
    >
      <div class="absolute -left-4 sm:-left-5 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-indigo-400 shadow-sm" />

      <div class="bg-white/70 rounded-xl p-4 sm:p-5">
        <div class="flex flex-wrap items-baseline gap-2 mb-1.5">
          <h3 class="font-semibold text-slate-800">{{ phase.title }}</h3>
          <span class="text-xs text-indigo-500 font-medium">{{ phase.period }}</span>
        </div>
        <p class="text-sm text-slate-600 leading-relaxed mb-3">{{ phase.description }}</p>
        <ul v-if="phase.milestones.length" class="space-y-1">
          <li
            v-for="(m, j) in phase.milestones"
            :key="j"
            class="flex items-start gap-2 text-sm text-slate-500"
          >
            <span class="text-amber-400 mt-0.5">◆</span>
            <span>{{ m }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <p v-else class="text-sm text-slate-400 text-center py-8">暂无时间轴数据</p>
</template>
