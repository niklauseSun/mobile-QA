import type { Browser } from "webdriverio";
import type { MobilePlatform } from "../selectors/types.js";

export interface LogTypesResult {
  types: string[];
  source: "driver" | "default";
  warning?: string;
}

type LogCapableDriver = Browser & {
  getLogs?: (type: string) => Promise<unknown[]>;
  getLog?: (type: string) => Promise<unknown[]>;
  getLogTypes?: () => Promise<string[]>;
  logTypes?: () => Promise<string[]>;
};

export function defaultDeviceLogType(platform: MobilePlatform) {
  return platform === "android" ? "logcat" : "syslog";
}

export async function listDriverLogTypes(
  driver: Browser,
  platform: MobilePlatform
): Promise<LogTypesResult> {
  const logDriver = driver as LogCapableDriver;

  try {
    if (typeof logDriver.getLogTypes === "function") {
      return {
        types: await logDriver.getLogTypes(),
        source: "driver"
      };
    }

    if (typeof logDriver.logTypes === "function") {
      return {
        types: await logDriver.logTypes(),
        source: "driver"
      };
    }
  } catch (error) {
    return {
      types: [defaultDeviceLogType(platform)],
      source: "default",
      warning: error instanceof Error ? error.message : String(error)
    };
  }

  return {
    types: [defaultDeviceLogType(platform)],
    source: "default",
    warning: "Driver does not expose a log types command."
  };
}

export async function getDriverLogs(
  driver: Browser,
  type: string
): Promise<unknown[]> {
  const logDriver = driver as LogCapableDriver;

  if (typeof logDriver.getLogs === "function") {
    return logDriver.getLogs(type);
  }

  if (typeof logDriver.getLog === "function") {
    return logDriver.getLog(type);
  }

  throw new Error(
    "Current WebDriverIO/Appium driver does not expose getLogs/getLog. Check Appium server and driver support for WebDriver log commands."
  );
}
