import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { UIMapRegistry } from "../core/registry.js";
import { PlatformInputSchema, formatElement, toJsonContent } from "./shared.js";

export const GetScreenElementsInputSchema = z
  .object({
    screen: z.string().trim().min(1),
    platform: PlatformInputSchema.optional()
  })
  .strict();

export function registerGetScreenElementsTool(
  server: McpServer,
  registry: UIMapRegistry
) {
  server.tool(
    "ui.get_screen_elements",
    "List elements for a UI Map screen.",
    GetScreenElementsInputSchema.shape,
    async (input) => {
      const parsed = GetScreenElementsInputSchema.parse(input);
      const screen = registry.getScreen(parsed.screen);

      if (screen === undefined) {
        return toJsonContent({
          ok: false,
          error: `Screen not found: ${parsed.screen}`,
          suggestions: registry.listScreens()
        });
      }

      return toJsonContent({
        ok: true,
        screen: parsed.screen,
        elements: Object.entries(screen.elements).map(([key, element]) =>
          formatElement(parsed.screen, key, element, parsed.platform)
        )
      });
    }
  );
}
