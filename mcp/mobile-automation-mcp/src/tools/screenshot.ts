import { z } from "zod";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import { ensureDir } from "../evidence/artifact.js";

export function registerScreenshotTool(server: McpServer) {
  server.tool(
    "mobile.screenshot",
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

      return {
        content: [
          {
            type: "text",
            text: `Screenshot saved: ${filePath}`
          }
        ]
      };
    }
  );
}