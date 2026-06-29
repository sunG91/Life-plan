import type { AppSettings, DoubaoMessage, StreamCallbacks } from '../types'

/** Volcengine Ark online inference (Chat Completions) endpoint */
const CHAT_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

export function isConfigured(settings: AppSettings): boolean {
  if (!settings.apiKey.trim()) return false
  if (settings.useEndpoint) return !!settings.endpointId.trim()
  return !!settings.modelId.trim()
}

function resolveModel(settings: AppSettings): string {
  const model = settings.useEndpoint ? settings.endpointId.trim() : settings.modelId.trim()
  if (!model) {
    throw new Error(settings.useEndpoint
      ? '请填写 Endpoint ID（ep- 开头）'
      : '请填写已开通的 Model ID')
  }
  return model
}

function buildRequestBody(
  settings: AppSettings,
  messages: DoubaoMessage[],
  stream: boolean,
  options: { temperature?: number; maxTokens?: number },
) {
  return {
    model: resolveModel(settings),
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    stream,
    ...(stream ? { stream_options: { include_usage: false } } : {}),
  }
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
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify(buildRequestBody(settings, messages, false, options)),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(parseApiError(errText, response.status))
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('模型返回了空内容，请稍后重试')
  }
  return content
}

export async function chatCompletionStream(
  settings: AppSettings,
  messages: DoubaoMessage[],
  callbacks: StreamCallbacks,
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<void> {
  let response: Response
  try {
    response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify(buildRequestBody(settings, messages, true, options)),
    })
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error('网络请求失败'))
    return
  }

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
        if (!payload || payload === '[DONE]') continue

        try {
          const parsed = JSON.parse(payload)
          const delta = parsed.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta) {
            fullText += delta
            callbacks.onToken(delta)
          }
        } catch {
          // Skip malformed stream chunks.
        }
      }
    }

    if (!fullText.trim()) {
      callbacks.onError(new Error('流式输出为空，请检查接入点状态或模型配额'))
      return
    }

    callbacks.onDone(fullText)
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)))
  } finally {
    reader.releaseLock()
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
        return `模型 ${model} 未开通。请前往火山方舟控制台开通模型，并创建推理接入点后使用 Endpoint ID（ep- 开头）。参考：在线推理（常规）文档。`
      }
      if (/endpoint|接入点/i.test(msg) && status === 404) {
        return '接入点不存在或未运行。请在控制台创建推理接入点并确认状态为“运行中”。'
      }
      return `API 错误 (${status}): ${msg}`
    }
  } catch {
    // Fall through to generic status handling.
  }
  if (status === 401) return 'API Key 无效，请检查设置。'
  if (status === 404) {
    return '模型或接入点不可用。建议创建推理接入点并使用 Endpoint ID，或先在模型广场开通 Model ID。'
  }
  if (status === 429) return '请求过于频繁，请稍后再试。'
  return `请求失败 (${status})`
}
