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

export function registerTypeTextTool(server: McpServer) {
  server.tool(
    "mobile.type_text",
    "Type text into a mobile input element.",
    {
      selector: selectorSchema,
      text: z.string(),
      clearFirst: z.boolean().optional(),
      timeoutMs: z.number().optional()
    },
    async ({ selector, text, clearFirst = true, timeoutMs = 10000 }) => {
      const { driver, adapter } = getMobileSession();

      const driverSelector = adapter.toDriverSelector(selector);
      const element = await driver.$(driverSelector);

      await element.waitForDisplayed({ timeout: timeoutMs });

      if (clearFirst) {
        await element.clearValue();
      }

      await element.setValue(text);

      return {
        content: [
          {
            type: "text",
            text: `Typed text into element: ${selector.strategy}=${selector.value}`
          }
        ]
      };
    }
  );
}