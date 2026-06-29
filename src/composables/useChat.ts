import { ref } from 'vue'
import { chatCompletionStream } from '../services/doubao'
import { MOTIVATION_SYSTEM } from '../agents/prompts'
import { loadChatHistory, saveChatHistory } from '../services/storage'
import { useSettings } from './useSettings'
import type { ChatMessage } from '../types'

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const messages = ref<ChatMessage[]>(loadChatHistory<ChatMessage>())
const loading = ref(false)

export function useChat() {
  const { settings } = useSettings()

  function persist() {
    saveChatHistory(messages.value)
  }

  function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const full: ChatMessage = { ...msg, id: uid(), timestamp: Date.now() }
    messages.value.push(full)
    persist()
    return full
  }

  function updateMessage(id: string, content: string) {
    const msg = messages.value.find((m) => m.id === id)
    if (msg) {
      msg.content = content
      persist()
    }
  }

  function clearHistory() {
    messages.value = []
    persist()
  }

  async function sendMessage(userText: string): Promise<void> {
    if (!userText.trim() || loading.value) return

    addMessage({ role: 'user', content: userText.trim() })
    loading.value = true

    const assistant = addMessage({
      role: 'assistant',
      content: '',
      agent: 'motivation',
    })

    const history = messages.value
      .filter((m) => m.id !== assistant.id)
      .slice(-10)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const systemPrompt = `${MOTIVATION_SYSTEM}

同时你也是人生规划顾问。当用户分享目标时，给出简要建议并引导他们使用“生成规划”功能获取完整路线。每次回复必须包含人生不确定性与无限可能的励志话语。`

    try {
      await chatCompletionStream(
        settings.value,
        [
          { role: 'system', content: systemPrompt },
          ...history,
        ],
        {
          onToken: (token) => {
            assistant.content += token
            updateMessage(assistant.id, assistant.content)
          },
          onDone: () => {
            loading.value = false
          },
          onError: (err) => {
            assistant.content = `抱歉，出现了一些问题：${err.message}`
            updateMessage(assistant.id, assistant.content)
            loading.value = false
          },
        },
        { temperature: 0.8, maxTokens: 1500 },
      )
    } catch (err) {
      assistant.content = `请求失败：${err instanceof Error ? err.message : String(err)}`
      updateMessage(assistant.id, assistant.content)
      loading.value = false
    }
  }

  return { messages, loading, sendMessage, clearHistory }
}
