import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { z } from "zod";

import type {
  DeviceRecord,
  DeviceRegistryFile,
  DeviceRuntime,
  DeviceStatus,
  DeviceType
} from "../models/device.js";
import { DevicePlatformSchema, DeviceRuntimeSchema } from "../models/request.js";
import { ServiceError } from "./errors.js";

const DeviceStatusSchema = z.enum(["idle", "leased", "unhealthy"]);
const DeviceTypeSchema = z.enum([
  "ios-simulator",
  "ios-real",
  "android-emulator",
  "android-real"
]);

const DeviceRecordSchema = z.object({
  id: z.string().min(1),
  platform: DevicePlatformSchema,
  type: DeviceTypeSchema,
  deviceName: z.string().min(1),
  osVersion: z.string().min(1),
  runtimes: z.array(DeviceRuntimeSchema).min(1),
  host: z.string().min(1),
  appiumServerUrl: z.string().url(),
  capabilities: z.record(z.unknown()),
  status: DeviceStatusSchema,
  currentLeaseId: z.string().optional(),
  leaseExpiresAt: z.string().optional(),
  leaseTaskId: z.string().optional(),
  currentSessionId: z.string().optional(),
  unhealthyReason: z.string().optional(),
  updatedAt: z.string().optional()
});

const DeviceRegistryFileSchema = z.object({
  devices: z.array(DeviceRecordSchema)
});

export class DeviceRegistry {
  private loaded = false;
  private devices: DeviceRecord[] = [];
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly registryPath = process.env.DEVICE_REGISTRY_PATH ??
      join(process.cwd(), "src/config/devices.json")
  ) {}

  async listDevices(): Promise<DeviceRecord[]> {
    await this.ensureLoaded();
    return this.devices.map((device) => ({ ...device }));
  }

  async getDevice(deviceId: string): Promise<DeviceRecord | undefined> {
    await this.ensureLoaded();
    const device = this.devices.find((candidate) => candidate.id === deviceId);
    return device ? { ...device } : undefined;
  }

  async getDeviceByLeaseId(leaseId: string): Promise<DeviceRecord | undefined> {
    await this.ensureLoaded();
    const device = this.devices.find((candidate) => candidate.currentLeaseId === leaseId);
    return device ? { ...device } : undefined;
  }

  async updateDevice(
    deviceId: string,
    updater: (device: DeviceRecord) => DeviceRecord
  ): Promise<DeviceRecord> {
    return this.serializedWrite(async () => {
      await this.ensureLoaded();
      const index = this.devices.findIndex((device) => device.id === deviceId);

      if (index === -1) {
        throw new ServiceError(404, "DEVICE_NOT_FOUND", `Device ${deviceId} not found`);
      }

      const updated = {
        ...updater({ ...this.devices[index] }),
        updatedAt: new Date().toISOString()
      };

      this.devices[index] = updated;
      await this.persist();
      return { ...updated };
    });
  }

  async markLeased(
    deviceId: string,
    leaseId: string,
    leaseExpiresAt: string,
    leaseTaskId?: string
  ): Promise<DeviceRecord> {
    return this.updateDevice(deviceId, (device) => ({
      ...device,
      status: "leased",
      currentLeaseId: leaseId,
      leaseExpiresAt,
      leaseTaskId,
      unhealthyReason: undefined
    }));
  }

  async markIdle(deviceId: string): Promise<DeviceRecord> {
    return this.updateDevice(deviceId, (device) => ({
      ...device,
      status: "idle",
      currentLeaseId: undefined,
      leaseExpiresAt: undefined,
      leaseTaskId: undefined,
      currentSessionId: undefined,
      unhealthyReason: undefined
    }));
  }

  async markUnhealthy(deviceId: string, reason: string): Promise<DeviceRecord> {
    return this.updateDevice(deviceId, (device) => ({
      ...device,
      status: "unhealthy",
      currentLeaseId: undefined,
      leaseExpiresAt: undefined,
      leaseTaskId: undefined,
      currentSessionId: undefined,
      unhealthyReason: reason
    }));
  }

  async markHealthy(deviceId: string): Promise<DeviceRecord> {
    return this.updateDevice(deviceId, (device) => ({
      ...device,
      status: device.status === "unhealthy" ? "idle" : device.status,
      unhealthyReason: undefined
    }));
  }

  async setCurrentSession(deviceId: string, sessionId: string): Promise<DeviceRecord> {
    return this.updateDevice(deviceId, (device) => ({
      ...device,
      currentSessionId: sessionId
    }));
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    const raw = await readFile(this.registryPath, "utf8");
    const parsed = DeviceRegistryFileSchema.parse(JSON.parse(raw)) as DeviceRegistryFile;
    this.devices = parsed.devices.map((device) => ({ ...device }));
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    const payload: DeviceRegistryFile = { devices: this.devices };
    await mkdir(dirname(this.registryPath), { recursive: true });

    const tempPath = `${this.registryPath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await rename(tempPath, this.registryPath);
  }

  private async serializedWrite<T>(operation: () => Promise<T>): Promise<T> {
    const previousWrite = this.writeQueue;
    let releaseWriteQueue: () => void = () => undefined;
    this.writeQueue = new Promise<void>((resolve) => {
      releaseWriteQueue = resolve;
    });

    await previousWrite;

    try {
      return await operation();
    } finally {
      releaseWriteQueue();
    }
  }
}

export type RegistryDeviceStatus = DeviceStatus;
export type RegistryDeviceType = DeviceType;
export type RegistryDeviceRuntime = DeviceRuntime;
