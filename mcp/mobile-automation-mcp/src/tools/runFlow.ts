import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runFlow } from "../flows/runner.js";
import { mobileFlowSchema } from "../flows/schema.js";

export function registerRunFlowTool(server: McpServer) {
  server.tool(
    "mobile_run_flow",
    "Run a mobile automation flow.",
    {
      flow: mobileFlowSchema
    },
    async ({ flow }) => {
      const result = await runFlow(flow);

      return {
        content: [
          {
            type: "text",
            text: [
              `Flow completed: ${flow.name}`,
              `Artifacts: ${result.runDir}`,
              ...(result.resources.length > 0
                ? [`Resources:`, ...result.resources.map((uri) => `- ${uri}`)]
                : []),
              ``,
              ...result.results
            ].join("\n")
          }
        ]
      };
    }
  );
}
