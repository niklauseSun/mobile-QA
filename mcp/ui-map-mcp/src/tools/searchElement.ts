import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { UIMapRegistry } from "../core/registry.js";
import { searchElements } from "../core/search.js";
import { PlatformInputSchema, toJsonContent } from "./shared.js";

export const SearchElementInputSchema = z
  .object({
    query: z.string().trim().min(1),
    screen: z.string().trim().min(1).optional(),
    platform: PlatformInputSchema.optional(),
    limit: z.number().int().positive().max(50).optional()
  })
  .strict();

export function registerSearchElementTool(
  server: McpServer,
  registry: UIMapRegistry
) {
  server.tool(
    "ui.search_element",
    "Search UI Map elements by semanticId, key, description, aliases, type, or actions.",
    SearchElementInputSchema.shape,
    async (input) => {
      const parsed = SearchElementInputSchema.parse(input);

      return toJsonContent({
        ok: true,
        query: parsed.query,
        results: searchElements(registry, parsed)
      });
    }
  );
}
