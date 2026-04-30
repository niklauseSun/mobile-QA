import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMobileSession } from "../appium/session.js";

export function registerLaunchAppTool(server: McpServer) {
  server.tool(
    "mobile.launch_app",
    "Create an Appium mobile session and launch or attach to an app.",
    {
      platform: z.enum(["ios", "android"]),
      runtime: z.enum(["rn", "android-native", "ios-native"]),

      appiumServerUrl: z.string().optional(),

      deviceName: z.string().optional(),
      platformVersion: z.string().optional(),

      app: z.string().optional(),

      bundleId: z.string().optional(),

      appPackage: z.string().optional(),
      appActivity: z.string().optional(),

      noReset: z.boolean().optional(),
      fullReset: z.boolean().optional(),
      newCommandTimeout: z.number().optional()
    },
    async (args) => {
      const session = await createMobileSession(args);

      return {
        content: [
          {
            type: "text",
            text: `Mobile session created. platform=${session.platform}, runtime=${session.runtime}, sessionId=${session.sessionId}`
          }
        ]
      };
    }
  );
}