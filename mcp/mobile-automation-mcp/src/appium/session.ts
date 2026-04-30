import { remote, type Browser } from "webdriverio";
import { createAdapter } from "../adapters/factory.js";
import type { MobileAdapter } from "../adapters/MobileAdapter.js";
import type { MobilePlatform, MobileRuntime } from "../selectors/types.js";
import {
  createCapabilities,
  type MobileSessionConfig
} from "./capabilities.js";

export interface MobileSession {
  driver: Browser;
  adapter: MobileAdapter;
  platform: MobilePlatform;
  runtime: MobileRuntime;
  sessionId: string;
}

let currentSession: MobileSession | null = null;

export async function createMobileSession(
  config: MobileSessionConfig
): Promise<MobileSession> {
  if (currentSession) {
    return currentSession;
  }

  const appiumServerUrl = config.appiumServerUrl ?? "http://127.0.0.1:4723";
  const url = new URL(appiumServerUrl);

  const driver = await remote({
    protocol: url.protocol.replace(":", ""),
    hostname: url.hostname,
    port: Number(url.port || 4723),
    path: "/",
    capabilities: createCapabilities(config)
  });

  const adapter = createAdapter(config.runtime);

  currentSession = {
    driver,
    adapter,
    platform: config.platform,
    runtime: config.runtime,
    sessionId: driver.sessionId
  };

  return currentSession;
}

export function getMobileSession(): MobileSession {
  if (!currentSession) {
    throw new Error("No active mobile session. Call mobile.launch_app first.");
  }

  return currentSession;
}

export async function closeMobileSession() {
  if (!currentSession) {
    return;
  }

  await currentSession.driver.deleteSession();
  currentSession = null;
}