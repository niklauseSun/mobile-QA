import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { MobilePlatform } from "../selectors/types.js";

const execFileAsync = promisify(execFile);

export type DevicePlatformFilter = MobilePlatform | "all";

export interface LocalMobileDevice {
  platform: MobilePlatform;
  id: string;
  name?: string;
  state: string;
  osVersion?: string;
  source: "adb" | "simctl";
  details: Record<string, string | boolean>;
}

export interface ListDevicesOptions {
  platform?: DevicePlatformFilter;
  includeUnavailable?: boolean;
}

export interface ListDevicesResult {
  devices: LocalMobileDevice[];
  errors: string[];
}

export async function listLocalDevices(
  options: ListDevicesOptions = {}
): Promise<ListDevicesResult> {
  const platform = options.platform ?? "all";
  const devices: LocalMobileDevice[] = [];
  const errors: string[] = [];

  if (platform === "all" || platform === "android") {
    const result = await runCommand("adb", ["devices", "-l"]);

    if (result.ok) {
      devices.push(
        ...parseAdbDevices(result.stdout, {
          includeUnavailable: options.includeUnavailable
        })
      );
    } else {
      errors.push(`android adb failed: ${result.error}`);
    }
  }

  if (platform === "all" || platform === "ios") {
    const result = await runCommand("xcrun", [
      "simctl",
      "list",
      "devices",
      "--json"
    ]);

    if (result.ok) {
      devices.push(
        ...parseSimctlDevices(result.stdout, {
          includeUnavailable: options.includeUnavailable
        })
      );
    } else {
      errors.push(`ios simctl failed: ${result.error}`);
    }
  }

  return { devices, errors };
}

export function parseAdbDevices(
  output: string,
  options: Pick<ListDevicesOptions, "includeUnavailable"> = {}
): LocalMobileDevice[] {
  const includeUnavailable = options.includeUnavailable ?? false;
  const devices: LocalMobileDevice[] = [];

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("List of devices attached")) {
      continue;
    }

    const [id, state, ...parts] = trimmed.split(/\s+/);

    if (!id || !state) {
      continue;
    }

    if (!includeUnavailable && state !== "device") {
      continue;
    }

    const details = parseKeyValueParts(parts);

    const name = details.model || details.device;

    devices.push({
      platform: "android",
      id,
      ...(name ? { name } : {}),
      state,
      source: "adb",
      details
    });
  }

  return devices;
}

export function parseSimctlDevices(
  output: string,
  options: Pick<ListDevicesOptions, "includeUnavailable"> = {}
): LocalMobileDevice[] {
  const includeUnavailable = options.includeUnavailable ?? false;
  const parsed = JSON.parse(output) as {
    devices?: Record<
      string,
      Array<{
        name?: string;
        udid?: string;
        state?: string;
        isAvailable?: boolean;
        deviceTypeIdentifier?: string;
      }>
    >;
  };
  const devices: LocalMobileDevice[] = [];

  for (const [runtime, runtimeDevices] of Object.entries(parsed.devices ?? {})) {
    for (const device of runtimeDevices) {
      if (!device.udid) {
        continue;
      }

      if (!includeUnavailable && device.isAvailable === false) {
        continue;
      }

      const osVersion = parseIosRuntimeVersion(runtime);

      devices.push({
        platform: "ios",
        id: device.udid,
        ...(device.name ? { name: device.name } : {}),
        state: device.state ?? "unknown",
        ...(osVersion ? { osVersion } : {}),
        source: "simctl",
        details: stripUndefined({
          runtime,
          deviceTypeIdentifier: device.deviceTypeIdentifier,
          isAvailable: device.isAvailable
        })
      });
    }
  }

  return devices;
}

async function runCommand(command: string, args: string[]) {
  try {
    const { stdout } = await execFileAsync(command, args, {
      timeout: 10000
    });

    return { ok: true as const, stdout };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function parseKeyValueParts(parts: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const part of parts) {
    const separatorIndex = part.indexOf(":");

    if (separatorIndex <= 0) {
      continue;
    }

    result[part.slice(0, separatorIndex)] = part.slice(separatorIndex + 1);
  }

  return result;
}

function parseIosRuntimeVersion(runtime: string) {
  const match = runtime.match(/\.iOS-(\d+(?:-\d+)*)$/);

  return match?.[1]?.replace(/-/g, ".");
}

function stripUndefined(
  value: Record<string, string | boolean | undefined>
): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) {
      result[key] = item;
    }
  }

  return result;
}
