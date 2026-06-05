import type { DeviceRecord } from "../models/device.js";

export interface AppiumHealthResult {
  healthy: boolean;
  status?: unknown;
  reason?: string;
}

export interface AppiumSessionSummary {
  sessionId: string;
  capabilities: Record<string, unknown>;
}

interface WebDriverResponse<T> {
  value?: T;
  sessionId?: string;
}

export class AppiumAdapter {
  constructor(private readonly timeoutMs = Number(process.env.APPIUM_TIMEOUT_MS ?? 5000)) {}

  async checkStatus(appiumServerUrl: string): Promise<AppiumHealthResult> {
    try {
      const response = await this.requestJson<unknown>(appiumServerUrl, "/status", {
        method: "GET"
      });

      return {
        healthy: true,
        status: response.value ?? response
      };
    } catch (error) {
      return {
        healthy: false,
        reason: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getSessions(appiumServerUrl: string): Promise<AppiumSessionSummary[]> {
    const response = await this.requestJson<unknown>(appiumServerUrl, "/sessions", {
      method: "GET"
    });
    const value = response.value;

    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((session): AppiumSessionSummary[] => {
      if (!session || typeof session !== "object") {
        return [];
      }

      const record = session as Record<string, unknown>;
      const sessionId = record.id ?? record.sessionId;

      if (typeof sessionId !== "string") {
        return [];
      }

      const capabilities =
        record.capabilities && typeof record.capabilities === "object"
          ? (record.capabilities as Record<string, unknown>)
          : {};

      return [{ sessionId, capabilities }];
    });
  }

  async findSessionForDevice(
    device: DeviceRecord,
    preferredSessionId?: string
  ): Promise<AppiumSessionSummary | undefined> {
    const sessions = await this.getSessions(device.appiumServerUrl);

    if (preferredSessionId) {
      const preferred = sessions.find((session) => session.sessionId === preferredSessionId);

      if (preferred) {
        return preferred;
      }
    }

    const matched = sessions.find((session) => this.sessionMatchesDevice(device, session));

    if (matched) {
      return matched;
    }

    return sessions.length === 1 ? sessions[0] : undefined;
  }

  async createSession(
    device: DeviceRecord,
    extraCapabilities: Record<string, unknown> = {}
  ): Promise<AppiumSessionSummary> {
    const response = await this.requestJson<unknown>(device.appiumServerUrl, "/session", {
      method: "POST",
      body: {
        capabilities: {
          alwaysMatch: {
            ...device.capabilities,
            ...extraCapabilities
          },
          firstMatch: [{}]
        }
      }
    });

    const value = response.value;
    const valueRecord = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const sessionId = valueRecord.sessionId ?? response.sessionId;

    if (typeof sessionId !== "string") {
      throw new Error("Appium did not return a sessionId");
    }

    const capabilities =
      valueRecord.capabilities && typeof valueRecord.capabilities === "object"
        ? (valueRecord.capabilities as Record<string, unknown>)
        : {};

    return { sessionId, capabilities };
  }

  async deleteSession(appiumServerUrl: string, sessionId: string): Promise<void> {
    await this.requestJson<unknown>(appiumServerUrl, `/session/${sessionId}`, {
      method: "DELETE"
    });
  }

  async deleteSessionsForDevice(device: DeviceRecord): Promise<string[]> {
    const sessions = await this.getSessions(device.appiumServerUrl);
    const sessionsToDelete = sessions.filter((session) =>
      device.currentSessionId
        ? session.sessionId === device.currentSessionId || this.sessionMatchesDevice(device, session)
        : this.sessionMatchesDevice(device, session)
    );
    const fallbackSessions = sessionsToDelete.length > 0 ? sessionsToDelete : sessions.length === 1 ? sessions : [];
    const deletedSessionIds: string[] = [];

    for (const session of fallbackSessions) {
      await this.deleteSession(device.appiumServerUrl, session.sessionId);
      deletedSessionIds.push(session.sessionId);
    }

    return deletedSessionIds;
  }

  async installApp(appiumServerUrl: string, sessionId: string, appPath: string): Promise<void> {
    await this.requestJson<unknown>(appiumServerUrl, `/session/${sessionId}/appium/device/install_app`, {
      method: "POST",
      body: { appPath }
    });
  }

  async removeApp(appiumServerUrl: string, sessionId: string, appId: string): Promise<void> {
    await this.requestJson<unknown>(appiumServerUrl, `/session/${sessionId}/appium/device/remove_app`, {
      method: "POST",
      body: { appId }
    });
  }

  async terminateApp(appiumServerUrl: string, sessionId: string, appId: string): Promise<void> {
    await this.requestJson<unknown>(appiumServerUrl, `/session/${sessionId}/appium/device/terminate_app`, {
      method: "POST",
      body: { appId }
    });
  }

  async activateApp(appiumServerUrl: string, sessionId: string, appId: string): Promise<void> {
    await this.requestJson<unknown>(appiumServerUrl, `/session/${sessionId}/appium/device/activate_app`, {
      method: "POST",
      body: { appId }
    });
  }

  async executeMobileCommand(
    appiumServerUrl: string,
    sessionId: string,
    script: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const response = await this.requestJson<unknown>(appiumServerUrl, `/session/${sessionId}/execute/sync`, {
      method: "POST",
      body: {
        script,
        args: [args]
      }
    });

    return response.value;
  }

  private sessionMatchesDevice(device: DeviceRecord, session: AppiumSessionSummary): boolean {
    const deviceUdid = getStringCapability(device.capabilities, "appium:udid", "udid");
    const sessionUdid = getStringCapability(session.capabilities, "appium:udid", "udid");

    if (deviceUdid && deviceUdid !== "auto" && sessionUdid && deviceUdid === sessionUdid) {
      return true;
    }

    const sessionDeviceName = getStringCapability(
      session.capabilities,
      "appium:deviceName",
      "deviceName"
    );

    return sessionDeviceName === device.deviceName;
  }

  private async requestJson<T>(
    appiumServerUrl: string,
    path: string,
    options: {
      method: "GET" | "POST" | "DELETE";
      body?: unknown;
    }
  ): Promise<WebDriverResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(joinUrl(appiumServerUrl, path), {
        method: options.method,
        headers: options.body ? { "content-type": "application/json" } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
      const bodyText = await response.text();
      const bodyJson = bodyText ? (JSON.parse(bodyText) as WebDriverResponse<T>) : {};

      if (!response.ok) {
        throw new Error(
          `Appium ${options.method} ${path} failed with ${response.status}: ${bodyText}`
        );
      }

      return bodyJson;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function getStringCapability(
  capabilities: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = capabilities[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}
