import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runFlow } from "../flows/runner.js";

const selectorSchema = z.object({
  strategy: z.enum([
    "accessibilityId",
    "testId",
    "resourceId",
    "iosPredicate",
    "iosClassChain",
    "text",
    "xpath"
  ]),
  value: z.string()
});

const flowStepSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("tap"),
    selector: selectorSchema,
    timeoutMs: z.number().optional()
  }),
  z.object({
    action: z.literal("type"),
    selector: selectorSchema,
    text: z.string(),
    clearFirst: z.boolean().optional(),
    timeoutMs: z.number().optional()
  }),
  z.object({
    action: z.literal("assertText"),
    text: z.string(),
    timeoutMs: z.number().optional()
  }),
  z.object({
    action: z.literal("wait"),
    ms: z.number()
  }),
  z.object({
    action: z.literal("screenshot"),
    name: z.string().optional()
  }),
  z.object({
    action: z.literal("back")
  })
]);

export function registerRunFlowTool(server: McpServer) {
  server.tool(
    "mobile.run_flow",
    "Run a mobile automation flow.",
    {
      flow: z.object({
        name: z.string(),
        platform: z.enum(["ios", "android"]).optional(),
        runtime: z.enum(["rn", "android-native", "ios-native"]).optional(),
        steps: z.array(flowStepSchema)
      })
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
              ``,
              ...result.results
            ].join("\n")
          }
        ]
      };
    }
  );
}