import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { writeTextFile } from "../evidence/artifact.js";
import { mobileFlowSchema } from "../flows/schema.js";
import {
  createGeneratedCasePath,
  generateAppiumCase
} from "../flows/generateAppiumCase.js";

export function registerGenerateAppiumCaseTool(server: McpServer) {
  server.tool(
    "mobile_generate_appium_case",
    "Generate a TypeScript WebDriverIO/Appium spec file from a Mobile Flow DSL.",
    {
      testName: z.string(),
      flow: mobileFlowSchema,
      outputDir: z.string().optional(),
      fileName: z.string().optional()
    },
    async ({
      testName,
      flow,
      outputDir = "artifacts/generated-tests",
      fileName
    }) => {
      const generated = generateAppiumCase(testName, flow);
      const filePath = createGeneratedCasePath(outputDir, testName, fileName);

      await writeTextFile(filePath, generated.code);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                filePath,
                summary: generated.summary
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
