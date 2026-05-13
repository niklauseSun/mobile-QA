#!/usr/bin/env node

import { parseDeploymentConfig } from "./deploy/config.js";
import { startHttpServer } from "./deploy/httpServer.js";
import { runStdioServer } from "./server.js";

async function main() {
  const config = parseDeploymentConfig();

  if (config.transport === "http") {
    const handle = await startHttpServer(config);
    const close = async () => {
      await handle.close();
      process.exit(0);
    };

    process.once("SIGINT", close);
    process.once("SIGTERM", close);
    return;
  }

  await runStdioServer();
}

main().catch((error) => {
  console.error("[mobile-automation-mcp] failed to start");
  console.error(error);
  process.exit(1);
});
