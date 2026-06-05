import type { FastifyBaseLogger } from "fastify";

import type { AndroidEmulatorAdapter } from "../adapters/androidEmulatorAdapter.js";
import type { AppiumAdapter } from "../adapters/appiumAdapter.js";
import type { IOSSimulatorAdapter } from "../adapters/iosSimulatorAdapter.js";
import type { InstallAppRequest } from "../models/request.js";
import type { DeviceLeaseService } from "./deviceLeaseService.js";

export interface InstallAppResult {
  leaseId: string;
  deviceId: string;
  appPath: string;
  installed: boolean;
  method: "appium-existing-session" | "appium-created-session" | "native-device-command";
  sessionId?: string;
}

export class AppInstallService {
  constructor(
    private readonly leaseService: DeviceLeaseService,
    private readonly appium: AppiumAdapter,
    private readonly iosSimulator: IOSSimulatorAdapter,
    private readonly androidEmulator: AndroidEmulatorAdapter,
    private readonly logger: FastifyBaseLogger
  ) {}

  async install(request: InstallAppRequest): Promise<InstallAppResult> {
    const { lease, device } = await this.leaseService.getActiveLeaseContext(
      request.leaseId,
      request.taskId
    );
    const existingSession = await this.appium.findSessionForDevice(
      device,
      lease.sessionId ?? device.currentSessionId
    );

    if (existingSession) {
      await this.appium.installApp(device.appiumServerUrl, existingSession.sessionId, request.appPath);
      await this.leaseService.attachSession(lease.leaseId, existingSession.sessionId);

      this.logger.info(
        { taskId: request.taskId, leaseId: lease.leaseId, deviceId: device.id },
        "app installed with existing Appium session"
      );

      return {
        leaseId: lease.leaseId,
        deviceId: device.id,
        appPath: request.appPath,
        installed: true,
        method: "appium-existing-session",
        sessionId: existingSession.sessionId
      };
    }

    if (device.type === "ios-simulator") {
      await this.iosSimulator.installApp(device, request.appPath);
      return this.nativeInstallResult(request, device.id);
    }

    if (device.platform === "android") {
      await this.androidEmulator.installApp(device, request.appPath);
      return this.nativeInstallResult(request, device.id);
    }

    const createdSession = await this.appium.createSession(device, {
      "appium:app": request.appPath,
      "appium:noReset": true
    });
    await this.leaseService.attachSession(lease.leaseId, createdSession.sessionId);

    this.logger.info(
      {
        taskId: request.taskId,
        leaseId: lease.leaseId,
        deviceId: device.id,
        sessionId: createdSession.sessionId
      },
      "app installed by creating Appium session"
    );

    return {
      leaseId: lease.leaseId,
      deviceId: device.id,
      appPath: request.appPath,
      installed: true,
      method: "appium-created-session",
      sessionId: createdSession.sessionId
    };
  }

  private nativeInstallResult(request: InstallAppRequest, deviceId: string): InstallAppResult {
    this.logger.info(
      { taskId: request.taskId, leaseId: request.leaseId, deviceId },
      "app installed with native device command"
    );

    return {
      leaseId: request.leaseId,
      deviceId,
      appPath: request.appPath,
      installed: true,
      method: "native-device-command"
    };
  }
}
