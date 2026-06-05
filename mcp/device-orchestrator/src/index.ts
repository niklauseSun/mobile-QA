import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";

import { AndroidEmulatorAdapter } from "./adapters/androidEmulatorAdapter.js";
import { AppiumAdapter } from "./adapters/appiumAdapter.js";
import { IOSSimulatorAdapter } from "./adapters/iosSimulatorAdapter.js";
import { RedisLockAdapter } from "./adapters/redisLockAdapter.js";
import { registerDeviceRoutes } from "./routes/device.routes.js";
import { AppInstallService } from "./services/appInstallService.js";
import { DeviceLeaseService } from "./services/deviceLeaseService.js";
import { DeviceRegistry } from "./services/deviceRegistry.js";
import { DeviceScheduler } from "./services/deviceScheduler.js";
import { isServiceError } from "./services/errors.js";
import { HealthCheckService } from "./services/healthCheckService.js";
import { ResetService } from "./services/resetService.js";

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    }
  });

  await fastify.register(cors, {
    origin: false
  });

  const registry = new DeviceRegistry();
  const scheduler = new DeviceScheduler(registry);
  const appium = new AppiumAdapter();
  const redisLock = new RedisLockAdapter();
  const iosSimulator = new IOSSimulatorAdapter();
  const androidEmulator = new AndroidEmulatorAdapter();
  const leaseService = new DeviceLeaseService(
    registry,
    scheduler,
    redisLock,
    appium,
    fastify.log
  );
  const healthCheckService = new HealthCheckService(registry, appium, fastify.log);
  const appInstallService = new AppInstallService(
    leaseService,
    appium,
    iosSimulator,
    androidEmulator,
    fastify.log
  );
  const resetService = new ResetService(
    leaseService,
    appium,
    iosSimulator,
    androidEmulator,
    fastify.log
  );

  fastify.setErrorHandler((error, request, reply) => {
    if (isServiceError(error)) {
      request.log.warn(
        {
          code: error.code,
          details: error.details
        },
        error.message
      );

      void reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
      return;
    }

    request.log.error({ err: error }, "unhandled request error");
    void reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error"
      }
    });
  });

  fastify.addHook("onClose", async () => {
    await redisLock.disconnect();
  });

  await registerDeviceRoutes(fastify, {
    scheduler,
    leaseService,
    healthCheckService,
    appInstallService,
    resetService
  });

  return fastify;
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? "0.0.0.0";
  const fastify = await buildServer();

  const shutdown = async (): Promise<void> => {
    await fastify.close();
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  await fastify.listen({ port, host });
}
