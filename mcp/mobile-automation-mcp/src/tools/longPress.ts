import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getMobileSession } from "../appium/session.js";
import { performLongPress } from "../appium/gestures.js";
import { selectorSchema } from "./mobileSchemas.js";

export function registerLongPressTool(server: McpServer) {
  server.tool(
    "mobile_long_press",
    "Long press an element or explicit screen coordinates.",
    {
      selector: selectorSchema.optional(),
      x: z.number().finite().optional(),
      y: z.number().finite().optional(),
      durationMs: z.number().int().positive().optional(),
      timeoutMs: z.number().int().positive().optional()
    },
    async (args) => {
      const { driver, adapter } = getMobileSession();

      await performLongPress(driver, adapter, args);

      return {
        content: [
          {
            type: "text",
            text: args.selector
              ? `Long pressed element: ${args.selector.strategy}=${args.selector.value}`
              : `Long pressed coordinates: x=${args.x}, y=${args.y}`
          }
        ]
      };
    }
  );
}
