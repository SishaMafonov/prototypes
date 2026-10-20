import httpServer from 'http-server';
import { fileURLToPath } from 'node:url';

// Both servers serve built files; Playwright owns this process and its teardown.
const servers = [['../../dist/',4173],['../../.browser-test-dist/',4174]].map(([path,port]) => {
  const server = httpServer.createServer({ root: fileURLToPath(new URL(path,import.meta.url)), cache: -1 });
  server.listen(port,'127.0.0.1');
  return server;
});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{
  for(const server of servers)server.close();
  process.exit(0);
});
