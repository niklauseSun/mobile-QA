import type { FastifyBaseLogger } from "fastify";

import type { AndroidEmulatorAdapter } from "../adapters/androidEmulatorAdapter.js";
import {
  getStringCapability,
  type AppiumAdapter,
  type AppiumSessionSummary
} from "../adapters/appiumAdapter.js";
import type { IOSSimulatorAdapter } from "../adapters/iosSimulatorAdapter.js";
import type { DeviceRecord } from "../models/device.js";
import type { DeviceLease } from "../models/lease.js";
import type { ResetAppRequest, ResetStrategy } from "../models/request.js";
import type { DeviceLeaseService } from "./deviceLeaseService.js";
import { ServiceError } from "./errors.js";

export interface ResetAppResult {
  leaseId: string;
  deviceId: string;
  strategy: ResetStrategy;
  actions: string[];
}

export class ResetService {
  constructor(
    private readonly leaseService: DeviceLeaseService,
    private readonly appium: AppiumAdapter,
    private readonly iosSimulator: IOSSimulatorAdapter,
    private readonly androidEmulator: AndroidEmulatorAdapter,
    private readonly logger: FastifyBaseLogger
  ) {}

  async reset(request: ResetAppRequest): Promise<ResetAppResult> {
    const { lease, device } = await this.leaseService.getActiveLeaseContext(
      request.leaseId,
      request.taskId
    );
    const actions: string[] = [];

    switch (request.strategy) {
      case "none":
        actions.push("No reset requested");
        break;
      case "restart_app":
        await this.restartApp(request, lease, device, actions);
        break;
      case "clear_data":
        await this.clearData(request, lease, device, actions);
        break;
      case "reinstall_app":
        await this.reinstallApp(request, lease, device, actions);
        break;
      case "reset_device":
        await this.resetDevice(request, device, actions);
        break;
      default:
        request.strategy satisfies never;
    }

    this.logger.info(
      { taskId: request.taskId, leaseId: lease.leaseId, deviceId: device.id, strategy: request.strategy },
      "device reset strategy completed"
    );

    return {
      leaseId: lease.leaseId,
      deviceId: device.id,
      strategy: request.strategy,
      actions
    };
  }

  private async restartApp(
    request: ResetAppRequest,
    lease: DeviceLease,
    device: DeviceRecord,
    actions: string[]
  ): Promise<void> {
    const appId = this.resolveAppId(request, device);
    const session = await this.requireSession(lease, device);

    await this.appium.terminateApp(device.appiumServerUrl, session.sessionId, appId);
    await this.appium.activateApp(device.appiumServerUrl, session.sessionId, appId);
    await this.leaseService.attachSession(lease.leaseId, session.sessionId);
    actions.push(`Restarted app ${appId}`);
  }

  private async clearData(
    request: ResetAppRequest,
    lease: DeviceLease,
    device: DeviceRecord,
    actions: string[]
  ): Promise<void> {
    const appId = this.resolveAppId(request, device);
    const session = await this.appium.findSessionForDevice(
      device,
      lease.sessionId ?? device.currentSessionId
    );

    if (session) {
      try {
        await this.appium.executeMobileCommand(device.appiumServerUrl, session.sessionId, "mobile: clearApp", {
          appId
        });
        await this.leaseService.attachSession(lease.leaseId, session.sessionId);
        actions.push(`Cleared app data through Appium for ${appId}`);
        return;
      } catch (error) {
        this.logger.warn(
          {
            taskId: request.taskId,
            leaseId: lease.leaseId,
            deviceId: device.id,
            error: error instanceof Error ? error.message : String(error)
          },
          "Appium clear app command failed; falling back to native adapter"
        );
      }
    }

    if (device.platform === "android") {
      actions.push(await this.androidEmulator.clearAppData(device, appId));
      return;
    }

    if (device.type === "ios-simulator" && request.appPath) {
      actions.push(await this.iosSimulator.uninstallApp(device, appId));
      actions.push(await this.iosSimulator.installApp(device, request.appPath));
      return;
    }

    throw new ServiceError(
      422,
      "RESET_STRATEGY_UNSUPPORTED",
      "clear_data for iOS requires an active Appium session or appPath for simulator reinstall"
    );
  }

  private async reinstallApp(
    request: ResetAppRequest,
    lease: DeviceLease,
    device: DeviceRecord,
    actions: string[]
  ): Promise<void> {
    if (!request.appPath) {
      throw new ServiceError(400, "APP_PATH_REQUIRED", "reinstall_app requires appPath");
    }

    const appId = request.appId ?? this.resolveOptionalAppId(device);
    const session = await this.appium.findSessionForDevice(
      device,
      lease.sessionId ?? device.currentSessionId
    );

    if (session) {
      if (appId) {
        await this.appium.removeApp(device.appiumServerUrl, session.sessionId, appId);
        actions.push(`Removed app ${appId} through Appium`);
      }

      await this.appium.installApp(device.appiumServerUrl, session.sessionId, request.appPath);
      await this.leaseService.attachSession(lease.leaseId, session.sessionId);
      actions.push(`Installed app ${request.appPath} through Appium`);
      return;
    }

    if (device.type === "ios-simulator") {
      if (appId) {
        actions.push(await this.iosSimulator.uninstallApp(device, appId));
      }
      actions.push(await this.iosSimulator.installApp(device, request.appPath));
      return;
    }

    if (device.platform === "android") {
      if (appId) {
        actions.push(await this.androidEmulator.uninstallApp(device, appId));
      }
      actions.push(await this.androidEmulator.installApp(device, request.appPath));
      return;
    }

    throw new ServiceError(
      422,
      "RESET_STRATEGY_UNSUPPORTED",
      "reinstall_app requires an active Appium session for this device type"
    );
  }

  private async resetDevice(
    request: ResetAppRequest,
    device: DeviceRecord,
    actions: string[]
  ): Promise<void> {
    try {
      const clearedSessionIds = await this.appium.deleteSessionsForDevice(device);
      actions.push(`Cleared Appium sessions: ${clearedSessionIds.join(", ") || "none"}`);
    } catch (error) {
      this.logger.warn(
        {
          taskId: request.taskId,
          leaseId: request.leaseId,
          deviceId: device.id,
          error: error instanceof Error ? error.message : String(error)
        },
        "failed to clear Appium sessions before reset_device"
      );
    }

    if (device.type === "ios-simulator") {
      actions.push(await this.iosSimulator.resetDevice(device));
      return;
    }

    if (device.type === "android-emulator") {
      actions.push(await this.androidEmulator.resetDevice(device));
      return;
    }

    throw new ServiceError(
      422,
      "RESET_STRATEGY_UNSUPPORTED",
      "reset_device is only implemented for simulators/emulators in the MVP"
    );
  }

  private async requireSession(
    lease: DeviceLease,
    device: DeviceRecord
  ): Promise<AppiumSessionSummary> {
    const session = await this.appium.findSessionForDevice(
      device,
      lease.sessionId ?? device.currentSessionId
    );

    if (!session) {
      throw new ServiceError(
        409,
        "ACTIVE_SESSION_REQUIRED",
        "This reset strategy requires an active Appium session"
      );
    }

    return session;
  }

  private resolveAppId(request: ResetAppRequest, device: DeviceRecord): string {
    const appId = request.appId ?? this.resolveOptionalAppId(device);

    if (!appId) {
      throw new ServiceError(
        400,
        "APP_ID_REQUIRED",
        "appId is required when it cannot be inferred from device capabilities"
      );
    }

    return appId;
  }

  private resolveOptionalAppId(device: DeviceRecord): string | undefined {
    return getStringCapability(
      device.capabilities,
      "appium:bundleId",
      "bundleId",
      "appium:appPackage",
      "appPackage"
    );
  }
}
