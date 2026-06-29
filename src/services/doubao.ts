import type { AppSettings, DoubaoMessage, StreamCallbacks } from '../types'

const CHAT_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

export function isConfigured(settings: AppSettings): boolean {
  if (!settings.apiKey.trim()) return false
  if (settings.useEndpoint) return !!settings.endpointId.trim()
  return !!settings.modelId.trim()
}

function resolveModel(settings: AppSettings): string {
  return settings.useEndpoint ? settings.endpointId : settings.modelId
}

export async function chatCompletion(
  settings: AppSettings,
  messages: DoubaoMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: resolveModel(settings),
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(parseApiError(errText, response.status))
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export async function chatCompletionStream(
  settings: AppSettings,
  messages: DoubaoMessage[],
  callbacks: StreamCallbacks,
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<void> {
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: resolveModel(settings),
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    callbacks.onError(new Error(parseApiError(errText, response.status)))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    callbacks.onError(new Error('无法读取流式响应'))
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') continue

        try {
          const parsed = JSON.parse(payload)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            fullText += delta
            callbacks.onToken(delta)
          }
        } catch {
          // Skip malformed chunks from the stream.
        }
      }
    }
    callbacks.onDone(fullText)
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)))
  }
}

function parseApiError(text: string, status: number): string {
  try {
    const json = JSON.parse(text)
    const msg = json.error?.message ?? json.message
    if (msg) {
      if (/not activated|has not activated|未开通|未激活/i.test(msg)) {
        const modelMatch = msg.match(/model\s+([\w.-]+)/i)
        const model = modelMatch?.[1] ?? '该模型'
        return `模型 ${model} 未开通。请前往火山方舟控制台 → 模型广场开通模型，并创建“推理接入点”后使用 Endpoint ID（ep- 开头）。也可以在设置中切换为已开通的 Model ID。`
      }
      if (/endpoint|接入点/i.test(msg) && status === 404) {
        return '接入点不存在或未开通，请检查 Endpoint ID 是否已在控制台创建并处于运行中。'
      }
      return `API 错误 (${status}): ${msg}`
    }
  } catch {
    // Fall through to generic status handling.
  }
  if (status === 401) return 'API Key 无效，请检查设置。'
  if (status === 404) {
    return '模型或接入点不可用。建议在火山方舟创建推理接入点，使用 Endpoint ID（ep- 开头），或开通对应 Model ID 后再试。'
  }
  if (status === 429) return '请求过于频繁，请稍后再试。'
  return `请求失败 (${status})`
}
