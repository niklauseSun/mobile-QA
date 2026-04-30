#!/usr/bin/env node

import { runServer } from "./server.js";

runServer().catch((error) => {
  console.error("[mobile-automation-mcp] failed to start");
  console.error(error);
  process.exit(1);
});