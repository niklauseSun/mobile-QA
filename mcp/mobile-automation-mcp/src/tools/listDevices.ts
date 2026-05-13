import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listLocalDevices } from "../appium/devices.js";

export function registerListDevicesTool(server: McpServer) {
  server.tool(
    "mobile_list_devices",
    "List local Android adb devices and iOS simulators visible on this machine.",
    {
      platform: z.enum(["android", "ios", "all"]).optional(),
      includeUnavailable: z.boolean().optional()
    },
    async ({ platform = "all", includeUnavailable = false }) => {
      const result = await listLocalDevices({
        platform,
        includeUnavailable
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );
}
