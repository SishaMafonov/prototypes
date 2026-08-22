# Chat Boty

Chat Boty talks only to a locally running [Ollama](https://ollama.com/) server. Vite proxies browser requests to `http://127.0.0.1:11434`, which avoids cross-origin browser failures and keeps the Ollama endpoint private to the local machine.

## One-time local setup

1. Install Ollama for Windows from the [official installer](https://ollama.com/download/windows).
2. Open a new PowerShell window and download a model, for example:

   ```powershell
   ollama pull gemma3
   ```

   Any model shown by `ollama list` will appear in the model picker.
3. Start the project:

   ```powershell
   npm run dev
   ```

Ollama normally starts in the background after installation and serves its local API on port 11434. If it is not running, start it with `ollama serve`.

## Configuration

The default endpoint is `http://127.0.0.1:11434`. To use another local endpoint, copy `.env.example` to `.env.local` and adjust `OLLAMA_HOST`. This setting is read by Vite only; it is not exposed to browser code.

For a strictly local-only Ollama installation, set `OLLAMA_NO_CLOUD=1` in the Ollama server environment and restart Ollama. Do not expose port 11434 beyond the local machine for this project.

## Production static preview

`npm run serve` serves the built `dist/` folder through Vite's preview server, including the same local Ollama proxy. `npm run dev` is the recommended development command.
