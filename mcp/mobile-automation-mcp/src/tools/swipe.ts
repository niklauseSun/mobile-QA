import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import { performSwipe } from "../appium/gestures.js";
import { gestureBaseSchema } from "./mobileSchemas.js";

export function registerSwipeTool(server: McpServer) {
  server.tool(
    "mobile_swipe",
    "Swipe in a direction or between explicit screen coordinates.",
    {
      ...gestureBaseSchema
    },
    async (args) => {
      const { driver } = getMobileSession();

      await performSwipe(driver, args);

      return {
        content: [
          {
            type: "text",
            text: `Swipe completed: ${args.direction ?? "default"}`
          }
        ]
      };
    }
  );
}
