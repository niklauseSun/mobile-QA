import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readAppiumLogFile } from "../logs/collector.js";

export function registerReadAppiumLogTool(server: McpServer) {
  server.tool(
    "mobile_read_appium_log",
    "Read and tail an Appium server log file from this machine.",
    {
      path: z.string().min(1),
      maxLines: z.number().int().positive().max(5000).optional(),
      maxBytes: z.number().int().positive().max(5 * 1024 * 1024).optional(),
      filter: z.string().optional(),
      redact: z.boolean().optional()
    },
    async ({
      path,
      maxLines = 200,
      maxBytes = 256 * 1024,
      filter,
      redact = true
    }) => {
      const result = await readAppiumLogFile(path, {
        maxLines,
        maxBytes,
        filter,
        redact
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );
}
