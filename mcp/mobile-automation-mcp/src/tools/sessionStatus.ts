import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getMobileSessionInfo,
  getOptionalMobileSession
} from "../appium/session.js";

interface ProbeResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: string;
}

export function registerSessionStatusTool(server: McpServer) {
  server.tool(
    "mobile_session_status",
    "Check whether the current Appium mobile session is alive.",
    {
      checkPageSource: z.boolean().optional()
    },
    async ({ checkPageSource = false }) => {
      const session = getOptionalMobileSession();
      const sessionInfo = getMobileSessionInfo();

      if (!session || !sessionInfo) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  active: false,
                  ok: false,
                  session: null,
                  checks: {}
                },
                null,
                2
              )
            }
          ]
        };
      }

      const checks: Record<string, ProbeResult> = {
        appiumStatus: await probe(() => session.driver.status()),
        sessionCapabilities: await probe(() => session.driver.getSession()),
        context: await probe(() => session.driver.getContext())
      };

      if (session.platform === "android") {
        checks.currentPackage = await probe(() => session.driver.getCurrentPackage());
        checks.currentActivity = await probe(() => session.driver.getCurrentActivity());
      }

      if (checkPageSource) {
        checks.pageSource = await probe(async () => {
          const source = await session.driver.getPageSource();
          return {
            length: source.length
          };
        });
      }

      const ok = Object.values(checks).every((check) => check.ok);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                active: true,
                ok,
                session: sessionInfo,
                checks
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

async function probe<T>(fn: () => Promise<T>): Promise<ProbeResult<T>> {
  try {
    return {
      ok: true,
      value: await fn()
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
