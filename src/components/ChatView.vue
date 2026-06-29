<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useChat } from '../composables/useChat'

const emit = defineEmits<{
  generatePlan: [goal: string]
}>()

const { messages, loading, sendMessage, clearHistory } = useChat()
const input = ref('')
const chatEnd = ref<HTMLElement>()

const suggestions = [
  '我想在三年内成为一名全栈工程师',
  '我想转行做产品经理，应该怎么规划？',
  '我想创业开一家咖啡店',
  '我想考研上岸，同时保持身体健康',
]

watch(messages, async () => {
  await nextTick()
  chatEnd.value?.scrollIntoView({ behavior: 'smooth' })
}, { deep: true })

async function handleSend() {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  await sendMessage(text)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function useSuggestion(text: string) {
  input.value = text
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex-1 overflow-y-auto px-4 sm:px-0 py-4 space-y-4">
      <div v-if="messages.length === 0" class="text-center py-8 sm:py-12">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-indigo-100 text-2xl mb-4">
          ✨
        </div>
        <h2 class="text-lg font-semibold text-slate-800 mb-2">告诉我，你想成为什么样的人？</h2>
        <p class="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
          人生充满不确定性，也正因如此，你拥有无限种可能。说出你的目标，我来帮你规划更清晰的路线。
        </p>
        <div class="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
          <button
            v-for="s in suggestions"
            :key="s"
            class="px-3 py-1.5 text-xs sm:text-sm text-slate-600 bg-white/80 hover:bg-white border border-slate-200/80 rounded-full transition-colors"
            @click="useSuggestion(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex animate-slide-up"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
          :class="msg.role === 'user'
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-white/90 text-slate-700 shadow-sm rounded-bl-md'"
        >
          {{ msg.content }}
          <span v-if="msg.role === 'assistant' && loading && msg === messages[messages.length - 1]" class="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse-soft" />
        </div>
      </div>
      <div ref="chatEnd" />
    </div>

    <div class="shrink-0 p-4 sm:px-0 border-t border-slate-200/50 bg-white/50 backdrop-blur-sm">
      <div class="flex gap-2">
        <textarea
          v-model="input"
          rows="1"
          placeholder="说说你想做什么..."
          class="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition max-h-32"
          @keydown="handleKeydown"
        />
        <button
          class="shrink-0 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          :disabled="loading || !input.trim()"
          @click="handleSend"
        >
          发送
        </button>
      </div>
      <div class="flex items-center justify-between mt-2">
        <button
          class="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          :disabled="!input.trim()"
          @click="emit('generatePlan', input.trim())"
        >
          生成完整规划 →
        </button>
        <button
          v-if="messages.length"
          class="text-xs text-slate-400 hover:text-slate-600"
          @click="clearHistory"
        >
          清空对话
        </button>
      </div>
    </div>
  </div>
</template>
