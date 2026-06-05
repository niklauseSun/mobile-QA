import type { DevicePlatform, DeviceRuntime } from "./device.js";

export type LeaseStatus = "active" | "released" | "expired";

export interface DeviceLease {
  leaseId: string;
  taskId?: string;
  deviceId: string;
  platform: DevicePlatform;
  runtime?: DeviceRuntime;
  lockKey: string;
  lockToken: string;
  acquiredAt: string;
  expiresAt: string;
  status: LeaseStatus;
  sessionId?: string;
}

export interface LeaseReleaseResult {
  leaseId: string;
  deviceId: string;
  released: boolean;
  clearedSessionIds: string[];
}
