import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";

const selectorSchema = z.object({
  strategy: z.enum([
    "accessibilityId",
    "testId",
    "resourceId",
    "iosPredicate",
    "iosClassChain",
    "text",
    "xpath"
  ]),
  value: z.string()
});

export function registerTapTool(server: McpServer) {
  server.tool(
    "mobile.tap",
    "Tap a mobile element.",
    {
      selector: selectorSchema,
      timeoutMs: z.number().optional()
    },
    async ({ selector, timeoutMs = 10000 }) => {
      const { driver, adapter } = getMobileSession();

      const driverSelector = adapter.toDriverSelector(selector);
      const element = await driver.$(driverSelector);

      await element.waitForDisplayed({ timeout: timeoutMs });
      await element.click();

      return {
        content: [
          {
            type: "text",
            text: `Tapped element: ${selector.strategy}=${selector.value}`
          }
        ]
      };
    }
  );
}