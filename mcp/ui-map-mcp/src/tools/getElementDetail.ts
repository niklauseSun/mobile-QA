import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { UIMapRegistry } from "../core/registry.js";
import { PlatformInputSchema, formatElement, toJsonContent } from "./shared.js";

export const GetElementDetailInputSchema = z
  .object({
    semanticId: z.string().trim().min(1),
    platform: PlatformInputSchema.optional()
  })
  .strict();

export function registerGetElementDetailTool(
  server: McpServer,
  registry: UIMapRegistry
) {
  server.tool(
    "ui.get_element_detail",
    "Get a UI Map element by semanticId.",
    GetElementDetailInputSchema.shape,
    async (input) => {
      const parsed = GetElementDetailInputSchema.parse(input);
      const location = registry.getElementLocationBySemanticId(parsed.semanticId);

      if (location === undefined) {
        return toJsonContent({
          ok: false,
          error: `Element not found: ${parsed.semanticId}`,
          suggestions: registry.listScreens()
        });
      }

      return toJsonContent({
        ok: true,
        element: {
          ...formatElement(
            location.screen,
            location.key,
            location.element,
            parsed.platform
          ),
          platform: location.element.platform
        }
      });
    }
  );
}
