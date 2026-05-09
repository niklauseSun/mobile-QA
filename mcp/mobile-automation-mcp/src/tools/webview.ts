import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import {
  getContexts,
  requireWebViewContext,
  switchContext
} from "../webview/context.js";

export function registerGetContextsTool(server: McpServer) {
  server.tool(
    "mobile_get_contexts",
    "List available native and WebView contexts for the current Appium session.",
    {},
    async () => {
      const { driver } = getMobileSession();
      const contexts = await getContexts(driver);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ contexts }, null, 2)
          }
        ]
      };
    }
  );
}

export function registerSwitchContextTool(server: McpServer) {
  server.tool(
    "mobile_switch_context",
    "Switch current Appium context to NATIVE_APP or a WEBVIEW context.",
    {
      context: z.string()
    },
    async ({ context }) => {
      const { driver } = getMobileSession();
      await switchContext(driver, context);

      return {
        content: [
          {
            type: "text",
            text: `Switched context: ${context}`
          }
        ]
      };
    }
  );
}

export function registerWebViewEvalTool(server: McpServer) {
  server.tool(
    "mobile_webview_eval",
    "Execute JavaScript in the current WebView context.",
    {
      script: z.string()
    },
    async ({ script }) => {
      const { driver } = getMobileSession();
      await requireWebViewContext(driver);

      const result = await driver.execute(script);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ result }, null, 2)
          }
        ]
      };
    }
  );
}

export function registerWebViewTapTool(server: McpServer) {
  server.tool(
    "mobile_webview_tap",
    "Tap an element in the current WebView context using a CSS selector.",
    {
      selector: z.string(),
      timeoutMs: z.number().optional()
    },
    async ({ selector, timeoutMs = 10000 }) => {
      const { driver } = getMobileSession();
      await requireWebViewContext(driver);

      const element = await driver.$(selector);
      await element.waitForDisplayed({ timeout: timeoutMs });
      await element.click();

      return {
        content: [
          {
            type: "text",
            text: `Tapped WebView element: ${selector}`
          }
        ]
      };
    }
  );
}

export function registerWebViewTypeTool(server: McpServer) {
  server.tool(
    "mobile_webview_type",
    "Type text into an element in the current WebView context using a CSS selector.",
    {
      selector: z.string(),
      text: z.string(),
      clearFirst: z.boolean().optional(),
      timeoutMs: z.number().optional()
    },
    async ({ selector, text, clearFirst = true, timeoutMs = 10000 }) => {
      const { driver } = getMobileSession();
      await requireWebViewContext(driver);

      const element = await driver.$(selector);
      await element.waitForDisplayed({ timeout: timeoutMs });

      if (clearFirst) {
        await element.clearValue();
      }

      await element.setValue(text);

      return {
        content: [
          {
            type: "text",
            text: `Typed text into WebView element: ${selector}`
          }
        ]
      };
    }
  );
}
