import { z } from "zod";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMobileSession } from "../appium/session.js";
import { writeTextFile } from "../evidence/artifact.js";

export function registerGetPageSourceTool(server: McpServer) {
  server.tool(
    "mobile.get_page_source",
    "Get current mobile page source XML.",
    {
      saveToFile: z.boolean().optional(),
      outputDir: z.string().optional()
    },
    async ({ saveToFile = false, outputDir = "artifacts/page-source" }) => {
      const { driver } = getMobileSession();

      const source = await driver.getPageSource();

      if (saveToFile) {
        const filePath = path.resolve(outputDir, `source-${Date.now()}.xml`);
        await writeTextFile(filePath, source);

        return {
          content: [
            {
              type: "text",
              text: `Page source saved: ${filePath}`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: "text",
            text: source.slice(0, 20000)
          }
        ]
      };
    }
  );
}