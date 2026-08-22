import './style.css'
import { chat, listModels, type ChatMessage } from './ollama'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main class="chat-app">
    <header class="app-header">
      <div><p class="eyebrow">Local LLM</p><h1>Chat Boty</h1></div>
      <div class="connection"><span class="connection-dot" aria-hidden="true"></span><span id="connection-status">Checking Ollama…</span></div>
    </header>
    <section class="toolbar" aria-label="Model controls">
      <label>Model <select id="model" disabled><option>Loading local models…</option></select></label>
      <button id="refresh" type="button">Refresh models</button>
    </section>
    <section id="messages" class="messages" aria-live="polite" aria-label="Conversation"></section>
    <form id="composer" class="composer">
      <label class="sr-only" for="prompt">Message</label>
      <textarea id="prompt" rows="3" placeholder="Send a message to your local model…" required></textarea>
      <button id="send" type="submit">Send</button>
    </form>
  </main>
`

const modelSelect = document.querySelector<HTMLSelectElement>('#model')!
const refreshButton = document.querySelector<HTMLButtonElement>('#refresh')!
const messagesElement = document.querySelector<HTMLElement>('#messages')!
const form = document.querySelector<HTMLFormElement>('#composer')!
const prompt = document.querySelector<HTMLTextAreaElement>('#prompt')!
const sendButton = document.querySelector<HTMLButtonElement>('#send')!
const status = document.querySelector<HTMLElement>('#connection-status')!
const connectionDot = document.querySelector<HTMLElement>('.connection-dot')!
let messages: ChatMessage[] = []

function setStatus(text: string, connected: boolean): void {
  status.textContent = text
  connectionDot.classList.toggle('connected', connected)
}

function renderMessages(): void {
  messagesElement.replaceChildren()
  if (messages.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'empty-state'
    empty.textContent = 'Choose a downloaded model and start a private, local conversation.'
    messagesElement.append(empty)
    return
  }
  for (const message of messages) {
    const article = document.createElement('article')
    article.className = `message message-${message.role}`
    const author = document.createElement('strong')
    author.textContent = message.role === 'user' ? 'You' : 'Local model'
    const content = document.createElement('p')
    content.textContent = message.content
    article.append(author, content)
    messagesElement.append(article)
  }
  messagesElement.scrollTop = messagesElement.scrollHeight
}

function setModels(models: string[]): void {
  modelSelect.replaceChildren()
  if (models.length === 0) {
    modelSelect.add(new Option('No models downloaded', ''))
    modelSelect.disabled = true
    return
  }
  for (const model of models) modelSelect.add(new Option(model, model))
  modelSelect.disabled = false
}

async function refreshModels(): Promise<void> {
  refreshButton.disabled = true
  setStatus('Checking Ollama…', false)
  try {
    const models = await listModels()
    setModels(models)
    setStatus(models.length === 0 ? 'Ollama is ready — download a model.' : 'Ollama connected', true)
  } catch (error) {
    setModels([])
    setStatus(error instanceof Error ? error.message : 'Unable to reach Ollama.', false)
  } finally {
    refreshButton.disabled = false
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const content = prompt.value.trim()
  const model = modelSelect.value
  if (!content || !model) return

  messages = [...messages, { role: 'user', content }]
  prompt.value = ''
  renderMessages()
  sendButton.disabled = true
  setStatus(`Thinking with ${model}…`, true)
  try {
    const response = await chat(model, messages)
    messages = [...messages, response]
    setStatus('Ollama connected', true)
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'The local model could not respond.', false)
  } finally {
    sendButton.disabled = false
    renderMessages()
  }
})

refreshButton.addEventListener('click', () => void refreshModels())
renderMessages()
void refreshModels()
