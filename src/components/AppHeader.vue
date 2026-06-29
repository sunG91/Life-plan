<script setup lang="ts">
defineProps<{
  showSettings: boolean
}>()

defineEmits<{
  openSettings: []
}>()
</script>

<template>
  <header class="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-slate-200/60">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <img src="/logo.svg" alt="Life Plan 职业生涯规划助手" class="h-10 w-auto" />
        <div class="hidden xs:block">
          <h1 class="text-base sm:text-lg font-semibold text-slate-800 leading-tight">职业生涯规划助手</h1>
          <p class="text-[11px] sm:text-xs text-slate-500 hidden sm:block">探索无限可能，规划精彩人生</p>
        </div>
      </div>

      <button
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        @click="$emit('openSettings')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="hidden sm:inline">API 设置</span>
      </button>
    </div>
  </header>
</template>
