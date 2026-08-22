---
name: project-init
description: Create a new independent browser project with npm, TypeScript 7+, Vite, and a static dist server.
---

# Project Init

Create a small, standalone browser-project scaffold. Keep it independent from every other prototype in this repository.

## Get a safe directory name

If the user did not supply a project name with `/project-init`, ask: `What should the new project directory be called?` Do not create files or install packages until they answer.

Normalize the answer by trimming it and replacing every run of whitespace with one hyphen (`-`). Use the normalized value as the directory name and state it when it differs from the input.

Validate the normalized value as one Windows directory-name segment. Reject it and ask again if it is empty; is `.` or `..`; contains a control character or any of `< > : " / \\ | ? *`; ends with a period or space; is a reserved device name (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, or `LPT1`–`LPT9`, including a name with one of those prefixes before a period); or would target an existing path in the repository root. Do not accept a path, nested path, or traversal component.

## Scaffold the project

Create `<repo-root>/<normalized-name>/` only after successful validation. Work inside that new directory and use npm unless the user explicitly requests a different package manager.

1. Run `npm init -y`.
2. Install development dependencies with `npm install --save-dev typescript@^7 vite http-server`.
3. Configure these package scripts:

   ```json
   {
     "dev": "vite --host 0.0.0.0",
     "build": "tsc --noEmit && vite build",
     "preview": "vite preview --host 0.0.0.0",
     "serve": "http-server dist --port 1234"
   }
   ```

   `vite` is the web bundler. `http-server` is the static server that serves the built `dist/` directory. Keep all three packages in `devDependencies`.

4. Add the smallest runnable TypeScript/Vite app using these files:

   ```text
   index.html
   tsconfig.json
   src/main.ts
   src/style.css
   ```

   Configure TypeScript for strict browser code, ES2022, ES modules, bundler module resolution, DOM libraries, and `noEmit`. Reference `/src/main.ts` from `index.html`; have `main.ts` import `style.css` and render a minimal visible welcome message. Do not add a framework unless requested.

5. Run `npm run build` to verify TypeScript and create `dist/`. Do not edit `dist/` by hand. Do not leave a dev or static-server process running unless the user asks to preview it.

## Safety and handoff

- Do not modify existing projects, the repository root package lock, or another project’s dependencies.
- Do not overwrite an existing directory. If setup fails after creation, preserve the partial scaffold and report the command failure; do not delete it automatically.
- On success, report the created directory, installed toolchain, verification result, and the commands `npm run dev` and `npm run serve` for the user to use next.
