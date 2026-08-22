export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

interface OllamaModel { name: string }
interface TagsResponse { models: OllamaModel[] }
interface ChatResponse { message: ChatMessage }

const baseUrl = '/ollama-api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, init)
  } catch (cause) {
    throw new Error(`Could not reach Ollama at ${baseUrl}. Start Ollama and make sure it is running locally.`, { cause })
  }

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Ollama returned ${response.status} ${response.statusText}.`)
  }
  return response.json() as Promise<T>
}

export async function listModels(): Promise<string[]> {
  const { models } = await request<TagsResponse>('/api/tags')
  return models.map(({ name }) => name)
}

export async function chat(model: string, messages: ChatMessage[]): Promise<ChatMessage> {
  const response = await request<ChatResponse>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, keep_alive: '5m' }),
  })
  return response.message
}
