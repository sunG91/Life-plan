<script setup lang="ts">
import { computed, ref } from 'vue'
import { renderMarkdown, downloadMarkdown, downloadPdfFromElement } from '../services/export'

const props = defineProps<{
  content: string
  goal: string
}>()

const docRef = ref<HTMLElement>()
const exporting = ref(false)

const html = computed(() => renderMarkdown(props.content))

async function exportPdf() {
  if (!docRef.value) return
  exporting.value = true
  try {
    const name = `职业生涯规划-${props.goal.slice(0, 10)}`
    await downloadPdfFromElement(docRef.value, name)
  } finally {
    exporting.value = false
  }
}

function exportMd() {
  const name = `职业生涯规划-${props.goal.slice(0, 10)}`
  downloadMarkdown(props.content, name)
}
</script>

<template>
  <div>
    <div class="flex gap-2 mb-4">
      <button
        class="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
        @click="exportMd"
      >
        导出 Markdown
      </button>
      <button
        class="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors disabled:opacity-50"
        :disabled="exporting"
        @click="exportPdf"
      >
        {{ exporting ? '生成中...' : '导出 PDF' }}
      </button>
    </div>

    <div
      ref="docRef"
      class="markdown-body bg-white/80 rounded-xl p-5 sm:p-8 text-sm text-slate-700 leading-relaxed"
      v-html="html"
    />
  </div>
</template>
