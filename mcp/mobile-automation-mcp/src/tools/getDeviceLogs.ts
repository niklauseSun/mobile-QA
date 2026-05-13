import { z } from "zod";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defaultDeviceLogType, getDriverLogs } from "../appium/logs.js";
import { getMobileSession } from "../appium/session.js";
import { writeTextFile } from "../evidence/artifact.js";
import { tryCreateArtifactResourceUri } from "../evidence/resources.js";
import { formatDeviceLogs } from "../logs/collector.js";

export function registerGetDeviceLogsTool(server: McpServer) {
  server.tool(
    "mobile_get_device_logs",
    "Get Android logcat or iOS syslog entries from the current Appium session.",
    {
      type: z.string().optional(),
      maxEntries: z.number().int().positive().max(2000).optional(),
      sinceTimestamp: z.number().optional(),
      filter: z.string().optional(),
      redact: z.boolean().optional(),
      saveToFile: z.boolean().optional(),
      outputDir: z.string().optional()
    },
    async ({
      type,
      maxEntries = 200,
      sinceTimestamp,
      filter,
      redact = true,
      saveToFile = false,
      outputDir = "artifacts/logs"
    }) => {
      const { driver, platform } = getMobileSession();
      const logType = type ?? defaultDeviceLogType(platform);
      const rawLogs = await getDriverLogs(driver, logType);
      const result = formatDeviceLogs(logType, rawLogs, {
        maxEntries,
        sinceTimestamp,
        filter,
        redact
      });

      if (saveToFile) {
        const filePath = path.resolve(
          outputDir,
          `${logType}-${Date.now()}.log`
        );
        await writeTextFile(filePath, JSON.stringify(result, null, 2));
        const resourceUri = tryCreateArtifactResourceUri(filePath);

        return {
          content: [
            {
              type: "text",
              text: [
                `Device logs saved: ${filePath}`,
                ...(resourceUri ? [`Resource: ${resourceUri}`] : [])
              ].join("\n")
            }
          ]
        };
      }

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
