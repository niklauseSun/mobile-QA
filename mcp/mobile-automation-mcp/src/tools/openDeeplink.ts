import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import { openDeepLink } from "../appium/gestures.js";

export function registerOpenDeeplinkTool(server: McpServer) {
  server.tool(
    "mobile_open_deeplink",
    "Open a mobile deep link URL with the app package name or bundle ID.",
    {
      url: z.string().min(1),
      appIdentifier: z.string().min(1),
      waitForLaunch: z.boolean().optional()
    },
    async (args) => {
      const { driver } = getMobileSession();

      await openDeepLink(driver, args);

      return {
        content: [
          {
            type: "text",
            text: `Opened deep link: ${args.url}`
          }
        ]
      };
    }
  );
}
