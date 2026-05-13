import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import { hideKeyboard } from "../appium/gestures.js";

export function registerHideKeyboardTool(server: McpServer) {
  server.tool(
    "mobile_hide_keyboard",
    "Hide the on-screen keyboard for the current mobile session.",
    {
      keys: z.array(z.string()).optional()
    },
    async (args) => {
      const { driver } = getMobileSession();
      const result = await hideKeyboard(driver, args);

      return {
        content: [
          {
            type: "text",
            text: `Hide keyboard completed. result=${JSON.stringify(result)}`
          }
        ]
      };
    }
  );
}
