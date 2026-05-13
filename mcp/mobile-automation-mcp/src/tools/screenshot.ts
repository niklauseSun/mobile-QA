import { z } from "zod";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import { ensureDir } from "../evidence/artifact.js";
import { tryCreateArtifactResourceUri } from "../evidence/resources.js";

export function registerScreenshotTool(server: McpServer) {
  server.tool(
    "mobile_screenshot",
    "Take a screenshot from current mobile screen.",
    {
      name: z.string().optional(),
      outputDir: z.string().optional()
    },
    async ({ name = "screenshot", outputDir = "artifacts/screenshots" }) => {
      const { driver } = getMobileSession();

      await ensureDir(outputDir);

      const filePath = path.resolve(
        outputDir,
        `${name}-${Date.now()}.png`
      );

      await driver.saveScreenshot(filePath);
      const resourceUri = tryCreateArtifactResourceUri(filePath);

      return {
        content: [
          {
            type: "text",
            text: [
              `Screenshot saved: ${filePath}`,
              ...(resourceUri ? [`Resource: ${resourceUri}`] : [])
            ].join("\n")
          }
        ]
      };
    }
  );
}
