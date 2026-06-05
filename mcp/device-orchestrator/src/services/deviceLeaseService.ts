import { randomUUID } from "node:crypto";

import type { FastifyBaseLogger } from "fastify";

import type { AppiumAdapter } from "../adapters/appiumAdapter.js";
import type { RedisLockAdapter } from "../adapters/redisLockAdapter.js";
import type { DeviceRecord } from "../models/device.js";
import type { DeviceLease, LeaseReleaseResult, LeaseStatus } from "../models/lease.js";
import type { AcquireDeviceRequest } from "../models/request.js";
import type { DeviceRegistry } from "./deviceRegistry.js";
import type { DeviceScheduler } from "./deviceScheduler.js";
import { ServiceError } from "./errors.js";

export interface AcquireDeviceResult {
  leaseId: string;
  deviceId: string;
  host: string;
  appiumServerUrl: string;
  capabilities: Record<string, unknown>;
  expiresAt: string;
}

export interface ActiveLeaseContext {
  lease: DeviceLease;
  device: DeviceRecord;
}

const DEFAULT_LEASE_TTL_MS = 15 * 60 * 1000;
const LOCK_GRACE_MS = 30 * 1000;

export class DeviceLeaseService {
  private readonly leases = new Map<string, DeviceLease>();

  constructor(
    private readonly registry: DeviceRegistry,
    private readonly scheduler: DeviceScheduler,
    private readonly lockAdapter: RedisLockAdapter,
    private readonly appium: AppiumAdapter,
    private readonly logger: FastifyBaseLogger
  ) {}

  async acquire(request: AcquireDeviceRequest): Promise<AcquireDeviceResult> {
    await this.expireStaleLeases(request.taskId);

    const candidates = await this.scheduler.listAvailable({
      platform: request.platform,
      deviceName: request.deviceName,
      osVersion: request.osVersion,
      runtime: request.runtime
    });

    for (const candidate of candidates) {
      const leaseTtlMs = request.leaseTtlMs ?? DEFAULT_LEASE_TTL_MS;
      const leaseId = randomUUID();
      const lockKey = this.getDeviceLockKey(candidate.id);
      const lockToken = leaseId;
      const lockResult = await this.acquireLock(lockKey, lockToken, leaseTtlMs + LOCK_GRACE_MS);

      if (!lockResult.acquired) {
        this.logger.info(
          { taskId: request.taskId, leaseId, deviceId: candidate.id },
          "device lock is already held"
        );
        continue;
      }

      try {
        const freshDevice = await this.registry.getDevice(candidate.id);

        if (!freshDevice || freshDevice.status !== "idle" || freshDevice.currentLeaseId) {
          await this.lockAdapter.release(lockKey, lockToken);
          continue;
        }

        const health = await this.appium.checkStatus(freshDevice.appiumServerUrl);

        if (!health.healthy) {
          await this.registry.markUnhealthy(
            freshDevice.id,
            health.reason ?? "Appium health check failed during acquire"
          );
          await this.lockAdapter.release(lockKey, lockToken);
          this.logger.warn(
            { taskId: request.taskId, leaseId, deviceId: freshDevice.id, reason: health.reason },
            "candidate failed health check during acquire"
          );
          continue;
        }

        const acquiredAt = new Date();
        const expiresAt = new Date(acquiredAt.getTime() + leaseTtlMs);
        const lease: DeviceLease = {
          leaseId,
          taskId: request.taskId,
          deviceId: freshDevice.id,
          platform: freshDevice.platform,
          runtime: request.runtime,
          lockKey,
          lockToken,
          acquiredAt: acquiredAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          status: "active"
        };

        this.leases.set(leaseId, lease);
        await this.registry.markLeased(freshDevice.id, leaseId, lease.expiresAt, request.taskId);

        this.logger.info(
          { taskId: request.taskId, leaseId, deviceId: freshDevice.id },
          "device lease acquired"
        );

        return {
          leaseId,
          deviceId: freshDevice.id,
          host: freshDevice.host,
          appiumServerUrl: freshDevice.appiumServerUrl,
          capabilities: freshDevice.capabilities,
          expiresAt: lease.expiresAt
        };
      } catch (error) {
        this.leases.delete(leaseId);
        await this.safeReleaseLock(lockKey, lockToken, request.taskId, leaseId, candidate.id);
        throw error;
      }
    }

    throw new ServiceError(
      409,
      "NO_AVAILABLE_DEVICE",
      "No healthy idle device matched the requested criteria"
    );
  }

  async release(leaseId: string, taskId?: string): Promise<LeaseReleaseResult> {
    return this.releaseLease(leaseId, "released", taskId);
  }

  async getActiveLeaseContext(leaseId: string, taskId?: string): Promise<ActiveLeaseContext> {
    const lease = await this.getLeaseOrRecover(leaseId);

    if (!lease) {
      throw new ServiceError(404, "LEASE_NOT_FOUND", `Lease ${leaseId} not found`);
    }

    if (this.isExpired(lease)) {
      await this.releaseLease(leaseId, "expired", taskId);
      throw new ServiceError(410, "LEASE_EXPIRED", `Lease ${leaseId} has expired`);
    }

    const device = await this.registry.getDevice(lease.deviceId);

    if (!device) {
      throw new ServiceError(404, "DEVICE_NOT_FOUND", `Device ${lease.deviceId} not found`);
    }

    return { lease, device };
  }

  async attachSession(leaseId: string, sessionId: string): Promise<void> {
    const lease = this.leases.get(leaseId);

    if (lease) {
      lease.sessionId = sessionId;
      this.leases.set(leaseId, lease);
      await this.registry.setCurrentSession(lease.deviceId, sessionId);
    }
  }

  private async releaseLease(
    leaseId: string,
    status: LeaseStatus,
    taskId?: string
  ): Promise<LeaseReleaseResult> {
    const lease = await this.getLeaseOrRecover(leaseId);

    if (!lease) {
      throw new ServiceError(404, "LEASE_NOT_FOUND", `Lease ${leaseId} not found`);
    }

    let device: DeviceRecord | undefined;
    let clearedSessionIds: string[] = [];

    try {
      device = await this.registry.getDevice(lease.deviceId);

      if (device) {
        try {
          clearedSessionIds = await this.appium.deleteSessionsForDevice({
            ...device,
            currentSessionId: lease.sessionId ?? device.currentSessionId
          });
        } catch (error) {
          this.logger.warn(
            {
              taskId,
              leaseId,
              deviceId: lease.deviceId,
              error: error instanceof Error ? error.message : String(error)
            },
            "failed to clear Appium sessions during release"
          );
        }
      }
    } finally {
      if (device) {
        await this.registry.markIdle(device.id);
      }

      lease.status = status;
      this.leases.delete(leaseId);
      await this.safeReleaseLock(lease.lockKey, lease.lockToken, taskId, leaseId, lease.deviceId);
    }

    this.logger.info(
      { taskId, leaseId, deviceId: lease.deviceId, clearedSessionIds },
      "device lease released"
    );

    return {
      leaseId,
      deviceId: lease.deviceId,
      released: true,
      clearedSessionIds
    };
  }

  private async expireStaleLeases(taskId?: string): Promise<void> {
    const staleLeaseIds = [...this.leases.values()]
      .filter((lease) => this.isExpired(lease))
      .map((lease) => lease.leaseId);

    for (const leaseId of staleLeaseIds) {
      await this.releaseLease(leaseId, "expired", taskId);
    }

    const leasedDevices = (await this.registry.listDevices()).filter(
      (device) =>
        device.status === "leased" &&
        device.currentLeaseId &&
        device.leaseExpiresAt &&
        new Date(device.leaseExpiresAt).getTime() <= Date.now() &&
        !this.leases.has(device.currentLeaseId)
    );

    for (const device of leasedDevices) {
      await this.releaseLease(device.currentLeaseId as string, "expired", taskId);
    }
  }

  private async acquireLock(
    lockKey: string,
    token: string,
    ttlMs: number
  ): Promise<{ acquired: boolean }> {
    try {
      return await this.lockAdapter.acquire(lockKey, token, ttlMs);
    } catch (error) {
      throw new ServiceError(
        503,
        "LOCK_BACKEND_UNAVAILABLE",
        "Redis lock backend is unavailable",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async safeReleaseLock(
    lockKey: string,
    token: string,
    taskId?: string,
    leaseId?: string,
    deviceId?: string
  ): Promise<void> {
    try {
      await this.lockAdapter.release(lockKey, token);
    } catch (error) {
      this.logger.error(
        {
          taskId,
          leaseId,
          deviceId,
          error: error instanceof Error ? error.message : String(error)
        },
        "failed to release device lock"
      );
    }
  }

  private isExpired(lease: DeviceLease): boolean {
    return new Date(lease.expiresAt).getTime() <= Date.now();
  }

  private getDeviceLockKey(deviceId: string): string {
    return `device-orchestrator:device:${deviceId}`;
  }

  private async getLeaseOrRecover(leaseId: string): Promise<DeviceLease | undefined> {
    const existingLease = this.leases.get(leaseId);

    if (existingLease) {
      return existingLease;
    }

    const device = await this.registry.getDeviceByLeaseId(leaseId);

    if (!device?.currentLeaseId) {
      return undefined;
    }

    const recoveredLease: DeviceLease = {
      leaseId,
      taskId: device.leaseTaskId,
      deviceId: device.id,
      platform: device.platform,
      lockKey: this.getDeviceLockKey(device.id),
      lockToken: leaseId,
      acquiredAt: device.updatedAt ?? new Date().toISOString(),
      expiresAt: device.leaseExpiresAt ?? new Date().toISOString(),
      status: "active",
      sessionId: device.currentSessionId
    };

    this.leases.set(leaseId, recoveredLease);
    return recoveredLease;
  }
}
