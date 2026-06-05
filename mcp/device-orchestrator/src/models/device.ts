export type DevicePlatform = "ios" | "android";

export type DeviceRuntime =
  | "react-native"
  | "ios-native"
  | "android-native"
  | "hybrid-webview";

export type DeviceType =
  | "ios-simulator"
  | "ios-real"
  | "android-emulator"
  | "android-real";

export type DeviceStatus = "idle" | "leased" | "unhealthy";

export interface DeviceRecord {
  id: string;
  platform: DevicePlatform;
  type: DeviceType;
  deviceName: string;
  osVersion: string;
  runtimes: DeviceRuntime[];
  host: string;
  appiumServerUrl: string;
  capabilities: Record<string, unknown>;
  status: DeviceStatus;
  currentLeaseId?: string;
  leaseExpiresAt?: string;
  leaseTaskId?: string;
  currentSessionId?: string;
  unhealthyReason?: string;
  updatedAt?: string;
}

export interface DeviceRegistryFile {
  devices: DeviceRecord[];
}

export interface DeviceMatchCriteria {
  platform: DevicePlatform;
  deviceName?: string;
  osVersion?: string;
  runtime?: DeviceRuntime;
}
