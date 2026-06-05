import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { UIMapRegistry } from "../core/registry.js";
import { resolveActionToSelector } from "../core/resolver.js";
import { PlatformInputSchema, toJsonContent } from "./shared.js";

export const ResolveActionToSelectorInputSchema = z
  .object({
    screen: z.string().trim().min(1).optional(),
    action: z.string().trim().min(1),
    platform: PlatformInputSchema
  })
  .strict();

export function registerResolveActionToSelectorTool(
  server: McpServer,
  registry: UIMapRegistry
) {
  server.tool(
    "ui.resolve_action_to_selector",
    "Resolve natural language action text to a selector from the UI Map.",
    ResolveActionToSelectorInputSchema.shape,
    async (input) => {
      const parsed = ResolveActionToSelectorInputSchema.parse(input);

      return toJsonContent(resolveActionToSelector(registry, parsed));
    }
  );
}
