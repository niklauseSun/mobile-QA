import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";

export function registerAssertTextTool(server: McpServer) {
  server.tool(
    "mobile.assert_text",
    "Assert that text exists on current mobile screen.",
    {
      text: z.string(),
      timeoutMs: z.number().optional()
    },
    async ({ text, timeoutMs = 10000 }) => {
      const { driver, adapter } = getMobileSession();

      const selector = adapter.textSelector(text);
      const element = await driver.$(selector);

      await element.waitForDisplayed({ timeout: timeoutMs });

      return {
        content: [
          {
            type: "text",
            text: `Assertion passed. Text exists: ${text}`
          }
        ]
      };
    }
  );
}