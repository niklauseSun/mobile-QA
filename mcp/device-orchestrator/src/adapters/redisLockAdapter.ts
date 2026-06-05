import { createClient, type RedisClientType } from "redis";

export interface LockAcquireResult {
  acquired: boolean;
  lockKey: string;
  token: string;
}

interface MemoryLock {
  token: string;
  expiresAt: number;
}

export class RedisLockAdapter {
  private client?: RedisClientType;
  private connecting?: Promise<RedisClientType>;
  private readonly memoryLocks = new Map<string, MemoryLock>();
  private readonly useMemoryLocks =
    process.env.DEVICE_ORCHESTRATOR_LOCK_MODE === "memory";

  constructor(private readonly redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379") {}

  async acquire(lockKey: string, token: string, ttlMs: number): Promise<LockAcquireResult> {
    if (this.useMemoryLocks) {
      this.pruneExpiredMemoryLocks();
      const existing = this.memoryLocks.get(lockKey);

      if (existing) {
        return { acquired: false, lockKey, token };
      }

      this.memoryLocks.set(lockKey, {
        token,
        expiresAt: Date.now() + ttlMs
      });
      return { acquired: true, lockKey, token };
    }

    const client = await this.getClient();
    const result = await client.set(lockKey, token, {
      NX: true,
      PX: ttlMs
    });

    return { acquired: result === "OK", lockKey, token };
  }

  async release(lockKey: string, token: string): Promise<boolean> {
    if (this.useMemoryLocks) {
      const existing = this.memoryLocks.get(lockKey);
      const shouldRelease = existing?.token === token;

      if (shouldRelease) {
        this.memoryLocks.delete(lockKey);
      }

      return shouldRelease;
    }

    const client = await this.getClient();
    const result = await client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      {
        keys: [lockKey],
        arguments: [token]
      }
    );

    return result === 1;
  }

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  private async getClient(): Promise<RedisClientType> {
    if (this.client?.isOpen) {
      return this.client;
    }

    if (!this.connecting) {
      const client = createClient({ url: this.redisUrl });
      client.on("error", () => {
        // Redis command failures are surfaced to callers. The event handler keeps
        // node-redis from treating background connection errors as unhandled.
      });

      this.connecting = client.connect().then(() => {
        this.client = client as RedisClientType;
        return this.client;
      });
    }

    return this.connecting;
  }

  private pruneExpiredMemoryLocks(): void {
    const now = Date.now();

    for (const [lockKey, lock] of this.memoryLocks.entries()) {
      if (lock.expiresAt <= now) {
        this.memoryLocks.delete(lockKey);
      }
    }
  }
}
