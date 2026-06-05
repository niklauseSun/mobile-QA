import { z } from "zod";

export const DevicePlatformSchema = z.enum(["ios", "android"]);

export const DeviceRuntimeSchema = z.enum([
  "react-native",
  "ios-native",
  "android-native",
  "hybrid-webview"
]);

export const AcquireDeviceRequestSchema = z.object({
  platform: DevicePlatformSchema,
  deviceName: z.string().min(1).optional(),
  osVersion: z.string().min(1).optional(),
  runtime: DeviceRuntimeSchema.optional(),
  taskId: z.string().min(1).optional(),
  leaseTtlMs: z.number().int().positive().max(24 * 60 * 60 * 1000).optional()
});

export type AcquireDeviceRequest = z.infer<typeof AcquireDeviceRequestSchema>;

export const ReleaseDeviceRequestSchema = z.object({
  leaseId: z.string().min(1),
  taskId: z.string().min(1).optional()
});

export type ReleaseDeviceRequest = z.infer<typeof ReleaseDeviceRequestSchema>;

export const HealthCheckRequestSchema = z.object({
  deviceId: z.string().min(1).optional(),
  taskId: z.string().min(1).optional()
});

export type HealthCheckRequest = z.infer<typeof HealthCheckRequestSchema>;

export const InstallAppRequestSchema = z.object({
  leaseId: z.string().min(1),
  appPath: z.string().min(1),
  taskId: z.string().min(1).optional()
});

export type InstallAppRequest = z.infer<typeof InstallAppRequestSchema>;

export const ResetStrategySchema = z.enum([
  "none",
  "restart_app",
  "clear_data",
  "reinstall_app",
  "reset_device"
]);

export const ResetAppRequestSchema = z.object({
  leaseId: z.string().min(1),
  strategy: ResetStrategySchema,
  appId: z.string().min(1).optional(),
  appPath: z.string().min(1).optional(),
  taskId: z.string().min(1).optional()
});

export type ResetAppRequest = z.infer<typeof ResetAppRequestSchema>;

export type ResetStrategy = z.infer<typeof ResetStrategySchema>;
