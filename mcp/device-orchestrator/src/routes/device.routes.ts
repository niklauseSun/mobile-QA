import type { FastifyInstance } from "fastify";
import type { ZodSchema } from "zod";

import type { DeviceScheduler } from "../services/deviceScheduler.js";
import type { DeviceLeaseService } from "../services/deviceLeaseService.js";
import type { HealthCheckService } from "../services/healthCheckService.js";
import type { AppInstallService } from "../services/appInstallService.js";
import type { ResetService } from "../services/resetService.js";
import { ServiceError } from "../services/errors.js";
import {
  AcquireDeviceRequestSchema,
  HealthCheckRequestSchema,
  InstallAppRequestSchema,
  ReleaseDeviceRequestSchema,
  ResetAppRequestSchema,
  type AcquireDeviceRequest,
  type HealthCheckRequest,
  type InstallAppRequest,
  type ReleaseDeviceRequest,
  type ResetAppRequest
} from "../models/request.js";

export interface DeviceRouteServices {
  scheduler: DeviceScheduler;
  leaseService: DeviceLeaseService;
  healthCheckService: HealthCheckService;
  appInstallService: AppInstallService;
  resetService: ResetService;
}

export async function registerDeviceRoutes(
  fastify: FastifyInstance,
  services: DeviceRouteServices
): Promise<void> {
  fastify.post<{ Body: AcquireDeviceRequest }>("/device/acquire", async (request) => {
    const body = parseBody(AcquireDeviceRequestSchema, request.body);
    const result = await services.leaseService.acquire(body);
    return { data: result };
  });

  fastify.post<{ Body: ReleaseDeviceRequest }>("/device/release", async (request) => {
    const body = parseBody(ReleaseDeviceRequestSchema, request.body);
    const result = await services.leaseService.release(body.leaseId, body.taskId);
    return { data: result };
  });

  fastify.post<{ Body: HealthCheckRequest }>("/device/health_check", async (request) => {
    const body = parseBody(HealthCheckRequestSchema, request.body ?? {});
    const result = await services.healthCheckService.check(body);
    return { data: result };
  });

  fastify.post<{ Body: InstallAppRequest }>("/device/install_app", async (request) => {
    const body = parseBody(InstallAppRequestSchema, request.body);
    const result = await services.appInstallService.install(body);
    return { data: result };
  });

  fastify.post<{ Body: ResetAppRequest }>("/device/reset_app", async (request) => {
    const body = parseBody(ResetAppRequestSchema, request.body);
    const result = await services.resetService.reset(body);
    return { data: result };
  });

  fastify.get("/device/list_available", async () => {
    const devices = await services.scheduler.listAvailable();
    return { data: devices };
  });
}

function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "Invalid request body",
      parsed.error.flatten()
    );
  }

  return parsed.data;
}
