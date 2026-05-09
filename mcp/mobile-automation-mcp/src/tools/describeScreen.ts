import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import { describePageSource } from "../screen/describe.js";

export function registerDescribeScreenTool(server: McpServer) {
  server.tool(
    "mobile_describe_screen",
    "Summarize current mobile page source into AI-friendly visible elements.",
    {
      includeInvisible: z.boolean().optional(),
      maxElements: z.number().int().positive().optional()
    },
    async ({ includeInvisible = false, maxElements = 100 }) => {
      const { driver } = getMobileSession();
      const source = await driver.getPageSource();
      const result = describePageSource(source, {
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
