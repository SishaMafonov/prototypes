import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'OLLAMA_')
  const target = env.OLLAMA_HOST || 'http://127.0.0.1:11434'
  const proxy = {
    target,
    changeOrigin: true,
    // The browser may load Chat Boty from a LAN address. Ollama rejects that
    // address as an untrusted Origin, so the server-side proxy uses its local
    // Ollama origin instead.
    headers: { origin: 'http://127.0.0.1:11434' },
    rewrite: (path: string) => path.replace(/^\/ollama-api/, ''),
  }

  return {
    server: { proxy: { '/ollama-api': proxy } },
    preview: { proxy: { '/ollama-api': proxy } },
  }
})
