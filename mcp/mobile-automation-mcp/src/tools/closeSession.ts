import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { closeMobileSession } from "../appium/session.js";

export function registerCloseSessionTool(server: McpServer) {
  server.tool(
    "mobile.close_session",
    "Close current Appium mobile session.",
    {},
    async () => {
      await closeMobileSession();

      return {
        content: [
          {
            type: "text",
            text: "Mobile session closed."
          }
        ]
      };
    }
  );
}