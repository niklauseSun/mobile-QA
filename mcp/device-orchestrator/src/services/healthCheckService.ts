import type { FastifyBaseLogger } from "fastify";

import type { AppiumAdapter, AppiumHealthResult } from "../adapters/appiumAdapter.js";
import type { DeviceRecord } from "../models/device.js";
import type { HealthCheckRequest } from "../models/request.js";
import type { DeviceRegistry } from "./deviceRegistry.js";
import { ServiceError } from "./errors.js";

export interface DeviceHealthCheckResult {
  deviceId: string;
  healthy: boolean;
  appium: AppiumHealthResult;
}

export class HealthCheckService {
  constructor(
    private readonly registry: DeviceRegistry,
    private readonly appium: AppiumAdapter,
    private readonly logger: FastifyBaseLogger
  ) {}

  async check(request: HealthCheckRequest): Promise<DeviceHealthCheckResult[]> {
    const devices = request.deviceId
      ? [await this.getDeviceOrThrow(request.deviceId)]
      : await this.registry.listDevices();

    const results: DeviceHealthCheckResult[] = [];

    for (const device of devices) {
      const result = await this.checkDevice(device, request.taskId);
      results.push(result);
    }

    return results;
  }

  async checkDevice(device: DeviceRecord, taskId?: string): Promise<DeviceHealthCheckResult> {
    const appium = await this.appium.checkStatus(device.appiumServerUrl);

    if (appium.healthy) {
      await this.registry.markHealthy(device.id);
      this.logger.info({ taskId, deviceId: device.id }, "device health check passed");
    } else {
      await this.registry.markUnhealthy(device.id, appium.reason ?? "Appium health check failed");
      this.logger.warn(
        { taskId, deviceId: device.id, reason: appium.reason },
        "device health check failed"
      );
    }

    return {
      deviceId: device.id,
      healthy: appium.healthy,
      appium
    };
  }

  private async getDeviceOrThrow(deviceId: string): Promise<DeviceRecord> {
    const device = await this.registry.getDevice(deviceId);

    if (!device) {
      throw new ServiceError(404, "DEVICE_NOT_FOUND", `Device ${deviceId} not found`);
    }

    return device;
  }
}
