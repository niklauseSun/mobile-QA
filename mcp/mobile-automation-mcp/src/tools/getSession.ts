import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSessionInfo } from "../appium/session.js";

export function registerGetSessionTool(server: McpServer) {
  server.tool(
    "mobile_get_session",
    "Get metadata for the current Appium mobile session.",
    {},
    async () => {
      const session = getMobileSessionInfo();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                active: Boolean(session),
                session
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}
