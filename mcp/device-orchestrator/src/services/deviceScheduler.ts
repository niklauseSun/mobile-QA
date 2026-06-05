import type {
  DeviceMatchCriteria,
  DeviceRecord
} from "../models/device.js";
import type { DeviceRegistry } from "./deviceRegistry.js";

export class DeviceScheduler {
  constructor(private readonly registry: DeviceRegistry) {}

  async listAvailable(criteria?: Partial<DeviceMatchCriteria>): Promise<DeviceRecord[]> {
    const devices = await this.registry.listDevices();

    return devices.filter((device) => {
      if (device.status !== "idle") {
        return false;
      }

      if (criteria?.platform && device.platform !== criteria.platform) {
        return false;
      }

      if (
        criteria?.deviceName &&
        device.deviceName.toLowerCase() !== criteria.deviceName.toLowerCase()
      ) {
        return false;
      }

      if (criteria?.osVersion && device.osVersion !== criteria.osVersion) {
        return false;
      }

      if (criteria?.runtime && !device.runtimes.includes(criteria.runtime)) {
        return false;
      }

      return true;
    });
  }
}
