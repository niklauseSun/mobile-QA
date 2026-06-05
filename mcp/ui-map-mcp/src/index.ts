#!/usr/bin/env node

import { runStdioServer } from "./server.js";

runStdioServer().catch((error) => {
  console.error("[ui-map-mcp] failed to start");
  console.error(error);
  process.exit(1);
});
