# Restore checkpoints

`rainbow-slut-current-2026-08-21.zip` is the initial source-only snapshot from this session.

`rainbow-slut-current-2026-08-21-context.zip` is the latest restore point. It includes the application source, project configuration, `pnpm-lock.yaml`, and `PROJECT_CONTEXT.md`; generated `dist/` and `node_modules/` are intentionally excluded.

To restore the latest point, extract the `-context.zip` archive into a replacement `rainbow-slut` directory, then run `pnpm install` followed by `pnpm run build`.
