import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { DeviceRecord } from "../models/device.js";
import { getStringCapability } from "./appiumAdapter.js";

const execFileAsync = promisify(execFile);

export class AndroidEmulatorAdapter {
  async installApp(device: DeviceRecord, appPath: string): Promise<string> {
    const target = getAndroidTarget(device);
    await execFileAsync("adb", ["-s", target, "install", "-r", appPath], {
      timeout: 120_000
    });

    return `Installed ${appPath} on Android device ${target}`;
  }

  async clearAppData(device: DeviceRecord, appId: string): Promise<string> {
    const target = getAndroidTarget(device);
    await execFileAsync("adb", ["-s", target, "shell", "pm", "clear", appId], {
      timeout: 60_000
    });

    return `Cleared ${appId} data on Android device ${target}`;
  }

  async uninstallApp(device: DeviceRecord, appId: string): Promise<string> {
    const target = getAndroidTarget(device);
    await execFileAsync("adb", ["-s", target, "uninstall", appId], {
      timeout: 60_000
    });

    return `Uninstalled ${appId} from Android device ${target}`;
  }

  async resetDevice(device: DeviceRecord): Promise<string> {
    const target = getAndroidTarget(device);
    await execFileAsync("adb", ["-s", target, "emu", "kill"], {
      timeout: 30_000
    });

    return `Stopped Android emulator ${target}; restart it from the emulator pool supervisor`;
  }
}

function getAndroidTarget(device: DeviceRecord): string {
  return getStringCapability(device.capabilities, "appium:udid", "udid") ?? device.deviceName;
}
