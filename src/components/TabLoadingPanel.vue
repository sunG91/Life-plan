<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue'

defineProps<{
  hint?: string
}>()
</script>

<template>
  <div class="py-10 flex flex-col items-center justify-center gap-3">
    <LoadingSpinner size="md" />
    <p v-if="hint" class="text-sm text-slate-500 animate-pulse-soft">{{ hint }}</p>
    <div class="w-full max-w-lg space-y-2.5 mt-1 px-4">
      <div class="skeleton-line w-full" />
      <div class="skeleton-line w-[92%]" />
      <div class="skeleton-line w-[78%]" />
    </div>
  </div>
</template>
