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
  appiumServerUrl: string;
  createdAt: string;
  config: MobileSessionInfoConfig;
}

let currentSession: MobileSession | null = null;

export interface MobileSessionInfoConfig {
  deviceName?: string;
  platformVersion?: string;
  app?: string;
  bundleId?: string;
  appPackage?: string;
  appActivity?: string;
  noReset?: boolean;
  fullReset?: boolean;
  newCommandTimeout?: number;
}

export interface MobileSessionInfo {
  sessionId: string;
  platform: MobilePlatform;
  runtime: MobileRuntime;
  appiumServerUrl: string;
  createdAt: string;
  config: MobileSessionInfoConfig;
}

export async function createMobileSession(
  config: MobileSessionConfig
): Promise<MobileSession> {
  if (currentSession && config.forceNew) {
    await closeMobileSession();
  }

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
    sessionId: driver.sessionId,
    appiumServerUrl,
    createdAt: new Date().toISOString(),
    config: createSessionInfoConfig(config)
  };

  return currentSession;
}

export function getMobileSession(): MobileSession {
  if (!currentSession) {
    throw new Error("No active mobile session. Call mobile_launch_app first.");
  }

  return currentSession;
}

export function getOptionalMobileSession(): MobileSession | null {
  return currentSession;
}

export function getMobileSessionInfo(): MobileSessionInfo | null {
  if (!currentSession) {
    return null;
  }

  return toMobileSessionInfo(currentSession);
}

export async function closeMobileSession(): Promise<boolean> {
  if (!currentSession) {
    return false;
  }

  const session = currentSession;
  currentSession = null;
  await session.driver.deleteSession();
  return true;
}

export async function closeAllMobileSessions() {
  return (await closeMobileSession()) ? 1 : 0;
}

function toMobileSessionInfo(session: MobileSession): MobileSessionInfo {
  return {
    sessionId: session.sessionId,
    platform: session.platform,
    runtime: session.runtime,
    appiumServerUrl: session.appiumServerUrl,
    createdAt: session.createdAt,
    config: session.config
  };
}

function createSessionInfoConfig(config: MobileSessionConfig): MobileSessionInfoConfig {
  return stripUndefined({
    deviceName:
      config.deviceName ??
      (config.platform === "ios" ? "iPhone 15" : "Android Emulator"),
    platformVersion: config.platformVersion,
    app: config.app,
    bundleId: config.bundleId,
    appPackage: config.appPackage,
    appActivity: config.appActivity,
    noReset: config.noReset ?? true,
    fullReset: config.fullReset ?? false,
    newCommandTimeout: config.newCommandTimeout ?? 300
  });
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      delete value[key];
    }
  }

  return value;
}
