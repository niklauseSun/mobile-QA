import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import { findSelectors } from "../screen/uiMap.js";

export function registerFindSelectorsTool(server: McpServer) {
  server.tool(
    "mobile_find_selectors",
    "Find stable selector candidates on the current screen by text, accessibility id, resource id, role, or class name.",
    {
      query: z.string().min(1),
      exact: z.boolean().optional(),
      includeInvisible: z.boolean().optional(),
      maxResults: z.number().int().positive().optional()
    },
    async ({
      query,
      exact = false,
      includeInvisible = false,
      maxResults = 20
    }) => {
      const { driver, platform, runtime } = getMobileSession();
      const source = await driver.getPageSource();
      const result = findSelectors(source, {
        query,
        exact,
        includeInvisible,
        maxResults,
        platform,
        runtime
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );
}
