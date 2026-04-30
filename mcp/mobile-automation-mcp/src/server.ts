import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerLaunchAppTool } from "./tools/launchApp.js";
import { registerCloseSessionTool } from "./tools/closeSession.js";
import { registerTapTool } from "./tools/tap.js";
import { registerTypeTextTool } from "./tools/typeText.js";
import { registerScreenshotTool } from "./tools/screenshot.js";
import { registerAssertTextTool } from "./tools/assertText.js";
import { registerGetPageSourceTool } from "./tools/getPageSource.js";
import { registerRunFlowTool } from "./tools/runFlow.js";

export async function runServer() {
  const server = new McpServer({
    name: "mobile-automation-mcp",
    version: "0.1.0"
  });

  registerLaunchAppTool(server);
  registerCloseSessionTool(server);
  registerTapTool(server);
  registerTypeTextTool(server);
  registerScreenshotTool(server);
  registerAssertTextTool(server);
  registerGetPageSourceTool(server);
  registerRunFlowTool(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}