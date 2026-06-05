import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from "node:path";

import { loadUIMapRegistry } from "./core/loader.js";
import { UIMapRegistry } from "./core/registry.js";
import { registerGetElementDetailTool } from "./tools/getElementDetail.js";
import { registerGetScreenElementsTool } from "./tools/getScreenElements.js";
import { registerListScreensTool } from "./tools/listScreens.js";
import { registerResolveActionToSelectorTool } from "./tools/resolveActionToSelector.js";
import { registerSearchElementTool } from "./tools/searchElement.js";
import { registerValidateSelectorExistsTool } from "./tools/validateSelectorExists.js";

export const DEFAULT_UI_MAP_DIR = "./ui-maps";

export function createUiMapServer(registry = new UIMapRegistry()) {
  const server = new McpServer({
    name: "ui-map-mcp",
    version: "0.1.0"
  });

  registerListScreensTool(server, registry);
  registerGetScreenElementsTool(server, registry);
  registerSearchElementTool(server, registry);
  registerGetElementDetailTool(server, registry);
  registerResolveActionToSelectorTool(server, registry);
  registerValidateSelectorExistsTool(server, registry);

  return server;
}

export async function loadRegistryFromEnvironment(): Promise<UIMapRegistry> {
  const uiMapDir = path.resolve(process.env.UI_MAP_DIR ?? DEFAULT_UI_MAP_DIR);

  try {
    return await loadUIMapRegistry(uiMapDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load UI Maps from ${uiMapDir}: ${message}`);
  }
}

export async function runStdioServer() {
  const registry = await loadRegistryFromEnvironment();
  const server = createUiMapServer(registry);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
