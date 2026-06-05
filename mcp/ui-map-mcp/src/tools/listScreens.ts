import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { UIMapRegistry } from "../core/registry.js";
import { toJsonContent } from "./shared.js";

export const ListScreensInputSchema = z.object({}).strict();

export function registerListScreensTool(
  server: McpServer,
  registry: UIMapRegistry
) {
  server.tool(
    "ui.list_screens",
    "List all screens in the loaded UI Map registry.",
    ListScreensInputSchema.shape,
    async (input) => {
      ListScreensInputSchema.parse(input);

      return toJsonContent({
        ok: true,
        screens: registry.listScreens().map((screenName) => {
          const screen = registry.getScreen(screenName);

          return {
            name: screenName,
            description: screen?.description,
            route: screen?.route,
            elementCount: screen ? Object.keys(screen.elements).length : 0
          };
        })
      });
    }
  );
}
