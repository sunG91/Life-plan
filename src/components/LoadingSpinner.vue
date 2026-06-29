<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: 'xs' | 'sm' | 'md'
    color?: 'indigo' | 'white' | 'slate'
  }>(),
  { size: 'sm', color: 'indigo' },
)

const sizeClass = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-5 h-5 border-2',
}

const colorClass = {
  indigo: 'border-indigo-200 border-t-indigo-600',
  white: 'border-white/30 border-t-white',
  slate: 'border-slate-200 border-t-slate-500',
}
</script>

<template>
  <span
    class="inline-block rounded-full animate-spin-slow shrink-0"
    :class="[sizeClass[size], colorClass[color]]"
    role="status"
    aria-label="加载中"
  />
</template>
