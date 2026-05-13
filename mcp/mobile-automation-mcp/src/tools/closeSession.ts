import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { closeMobileSession } from "../appium/session.js";

export function registerCloseSessionTool(server: McpServer) {
  server.tool(
    "mobile_close_session",
    "Close current Appium mobile session.",
    {},
    async () => {
      const closed = await closeMobileSession();

      return {
        content: [
          {
            type: "text",
            text: closed
              ? "Mobile session closed."
              : "No active mobile session to close."
          }
        ]
      };
    }
  );
}
