import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getMobileSession } from "../appium/session.js";
import { performScroll } from "../appium/gestures.js";
import {
  gestureBaseSchema,
  selectorSchema
} from "./mobileSchemas.js";

export function registerScrollTool(server: McpServer) {
  server.tool(
    "mobile_scroll",
    "Scroll by swiping, optionally until a target element is visible.",
    {
      ...gestureBaseSchema,
      selector: selectorSchema.optional(),
      scrollableSelector: selectorSchema.optional(),
      maxScrolls: z.number().int().positive().optional(),
      timeoutMs: z.number().int().positive().optional()
    },
    async (args) => {
      const { driver, adapter } = getMobileSession();

      await performScroll(driver, adapter, args);

      return {
        content: [
          {
            type: "text",
            text: args.selector
              ? `Scrolled to element: ${args.selector.strategy}=${args.selector.value}`
              : `Scroll completed. swipes=${args.maxScrolls ?? 1}`
          }
        ]
      };
    }
  );
}
