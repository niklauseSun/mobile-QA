import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import { buildUiMap } from "../screen/uiMap.js";

export function registerUiMapTool(server: McpServer) {
  server.tool(
    "mobile_ui_map",
    "Build a structured UI map from the current mobile page source with selector candidates.",
    {
      includeInvisible: z.boolean().optional(),
      maxElements: z.number().int().positive().optional()
    },
    async ({ includeInvisible = false, maxElements = 100 }) => {
      const { driver, platform, runtime } = getMobileSession();
      const source = await driver.getPageSource();
      const result = buildUiMap(source, {
        platform,
        runtime,
        includeInvisible,
        maxElements
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
