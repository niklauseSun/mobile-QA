import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { DeviceRecord } from "../models/device.js";
import { getStringCapability } from "./appiumAdapter.js";

const execFileAsync = promisify(execFile);

export class IOSSimulatorAdapter {
  async installApp(device: DeviceRecord, appPath: string): Promise<string> {
    const target = getSimulatorTarget(device);
    await execFileAsync("xcrun", ["simctl", "install", target, appPath], {
      timeout: 120_000
    });

    return `Installed ${appPath} on iOS simulator ${target}`;
  }

  async uninstallApp(device: DeviceRecord, appId: string): Promise<string> {
    const target = getSimulatorTarget(device);
    await execFileAsync("xcrun", ["simctl", "uninstall", target, appId], {
      timeout: 60_000
    });

    return `Uninstalled ${appId} from iOS simulator ${target}`;
  }

  async resetDevice(device: DeviceRecord): Promise<string> {
    const target = getSimulatorTarget(device);
    await execFileAsync("xcrun", ["simctl", "erase", target], {
      timeout: 120_000
    });

    return `Erased iOS simulator ${target}`;
  }
}

function getSimulatorTarget(device: DeviceRecord): string {
  const udid = getStringCapability(device.capabilities, "appium:udid", "udid");
  return udid && udid !== "auto" ? udid : "booted";
}
