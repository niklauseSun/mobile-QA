import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { closeAllMobileSessions } from "../appium/session.js";

export function registerCloseAllSessionsTool(server: McpServer) {
  server.tool(
    "mobile_close_all_sessions",
    "Close all Appium mobile sessions managed by this MCP server.",
    {},
    async () => {
      const closed = await closeAllMobileSessions();

      return {
        content: [
          {
            type: "text",
            text: `Closed mobile sessions: ${closed}`
          }
        ]
      };
    }
  );
}
