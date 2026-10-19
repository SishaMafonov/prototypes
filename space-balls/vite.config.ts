import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let repositoryCommit = 'unknown';
try {
  repositoryCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  // Source archives can still run without Git metadata.
}

export default defineConfig({
  define: {
    __REPOSITORY_COMMIT__: JSON.stringify(repositoryCommit),
  },
  build: {
    rolldownOptions: {
      input: {
        game: 'index.html',
        cvTestTool: 'tools/cv-test-tool/index.html',
        motionFixture: 'tools/cv-test-tool/fixtures/motion.html',
      },
    },
  },
});
