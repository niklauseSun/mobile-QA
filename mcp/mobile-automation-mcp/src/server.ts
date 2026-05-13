import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerArtifactResources } from "./evidence/resources.js";
import { registerLaunchAppTool } from "./tools/launchApp.js";
import { registerCloseSessionTool } from "./tools/closeSession.js";
import { registerCloseAllSessionsTool } from "./tools/closeAllSessions.js";
import { registerGetSessionTool } from "./tools/getSession.js";
import { registerSessionStatusTool } from "./tools/sessionStatus.js";
import { registerListDevicesTool } from "./tools/listDevices.js";
import { registerTapTool } from "./tools/tap.js";
import { registerTypeTextTool } from "./tools/typeText.js";
import { registerSwipeTool } from "./tools/swipe.js";
import { registerScrollTool } from "./tools/scroll.js";
import { registerLongPressTool } from "./tools/longPress.js";
import { registerHideKeyboardTool } from "./tools/hideKeyboard.js";
import { registerOpenDeeplinkTool } from "./tools/openDeeplink.js";
import { registerListLogTypesTool } from "./tools/listLogTypes.js";
import { registerGetDeviceLogsTool } from "./tools/getDeviceLogs.js";
import { registerReadAppiumLogTool } from "./tools/readAppiumLog.js";
import { registerScreenshotTool } from "./tools/screenshot.js";
import { registerAssertTextTool } from "./tools/assertText.js";
import { registerGetPageSourceTool } from "./tools/getPageSource.js";
import { registerDescribeScreenTool } from "./tools/describeScreen.js";
import { registerUiMapTool } from "./tools/uiMap.js";
import { registerFindSelectorsTool } from "./tools/findSelectors.js";
import { registerRunFlowTool } from "./tools/runFlow.js";
import { registerGenerateAppiumCaseTool } from "./tools/generateAppiumCase.js";
import {
  registerGetContextsTool,
  registerSwitchContextTool,
  registerWebViewEvalTool,
  registerWebViewTapTool,
  registerWebViewTypeTool
} from "./tools/webview.js";

export function createMobileAutomationServer() {
  const server = new McpServer({
    name: "mobile-automation-mcp",
    version: "0.1.0"
  });

  registerArtifactResources(server);

  registerLaunchAppTool(server);
  registerCloseSessionTool(server);
  registerCloseAllSessionsTool(server);
  registerGetSessionTool(server);
  registerSessionStatusTool(server);
  registerListDevicesTool(server);
  registerTapTool(server);
  registerTypeTextTool(server);
  registerSwipeTool(server);
  registerScrollTool(server);
  registerLongPressTool(server);
  registerHideKeyboardTool(server);
  registerOpenDeeplinkTool(server);
  registerListLogTypesTool(server);
  registerGetDeviceLogsTool(server);
  registerReadAppiumLogTool(server);
  registerScreenshotTool(server);
  registerAssertTextTool(server);
  registerGetPageSourceTool(server);
  registerDescribeScreenTool(server);
  registerUiMapTool(server);
  registerFindSelectorsTool(server);
  registerGetContextsTool(server);
  registerSwitchContextTool(server);
  registerWebViewEvalTool(server);
  registerWebViewTapTool(server);
  registerWebViewTypeTool(server);
  registerGenerateAppiumCaseTool(server);
  registerRunFlowTool(server);

  return server;
}

export async function runStdioServer() {
  const server = createMobileAutomationServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
