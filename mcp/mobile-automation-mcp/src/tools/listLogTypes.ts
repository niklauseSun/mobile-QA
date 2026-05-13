import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import { listDriverLogTypes } from "../appium/logs.js";

export function registerListLogTypesTool(server: McpServer) {
  server.tool(
    "mobile_list_log_types",
    "List device log types exposed by the current Appium session.",
    {},
    async () => {
      const { driver, platform } = getMobileSession();
      const result = await listDriverLogTypes(driver, platform);

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
