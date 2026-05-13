import { timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

export type McpTransportMode = "stdio" | "http";

export interface DeploymentConfig {
  transport: McpTransportMode;
  host: string;
  port: number;
  apiKey?: string;
  allowedOrigins: string[];
  allowedHosts: string[];
  enableStreamableHttp: boolean;
  enableSse: boolean;
  allowInsecureHttp: boolean;
}

type EnvLike = Record<string, string | undefined>;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const DEFAULT_LOCAL_ALLOWED_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];

export function parseDeploymentConfig(env: EnvLike = process.env): DeploymentConfig {
  const transport = parseTransport(
    env.MOBILE_MCP_TRANSPORT ?? env.MCP_TRANSPORT ?? "stdio"
  );
  const host = env.MOBILE_MCP_HOST ?? env.HOST ?? "127.0.0.1";
  const port = parsePort(env.MOBILE_MCP_PORT ?? env.PORT ?? "3000");
  const apiKey = nonEmpty(env.MOBILE_MCP_API_KEY ?? env.MCP_API_KEY);
  const allowInsecureHttp = parseBoolean(env.MOBILE_MCP_ALLOW_INSECURE_HTTP) ?? false;
  const configuredAllowedHosts = parseList(env.MOBILE_MCP_ALLOWED_HOSTS);
  const config: DeploymentConfig = {
    transport,
    host,
    port,
    apiKey,
    allowedOrigins: parseList(env.MOBILE_MCP_ALLOWED_ORIGINS),
    allowedHosts:
      configuredAllowedHosts.length > 0
        ? configuredAllowedHosts
        : defaultAllowedHosts(host),
    enableStreamableHttp: parseBoolean(env.MOBILE_MCP_ENABLE_HTTP) ?? true,
    enableSse: parseBoolean(env.MOBILE_MCP_ENABLE_SSE) ?? true,
    allowInsecureHttp
  };

  if (
    config.transport === "http" &&
    !config.apiKey &&
    !config.allowInsecureHttp &&
    !isLocalHost(config.host)
  ) {
    throw new Error(
      "MOBILE_MCP_API_KEY is required when binding HTTP transport to a non-local host. Set MOBILE_MCP_ALLOW_INSECURE_HTTP=true only for trusted isolated networks."
    );
  }

  return config;
}

export function isAuthorized(
  headers: IncomingHttpHeaders | Record<string, string | string[] | undefined>,
  apiKey: string | undefined
) {
  if (!apiKey) {
    return true;
  }

  const authorization = firstHeader(headers.authorization);
  const apiKeyHeader = firstHeader(headers["x-api-key"]);
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  return safeEqual(bearerToken, apiKey) || safeEqual(apiKeyHeader, apiKey);
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]) {
  if (!origin || allowedOrigins.length === 0) {
    return false;
  }

  return allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

export function isHostAllowed(hostHeader: string | undefined, allowedHosts: string[]) {
  if (allowedHosts.length === 0) {
    return true;
  }

  if (!hostHeader) {
    return false;
  }

  try {
    const hostname = new URL(`http://${hostHeader}`).hostname;
    return allowedHosts.includes(hostHeader) || allowedHosts.includes(hostname);
  } catch {
    return false;
  }
}

function parseTransport(value: string): McpTransportMode {
  if (value === "stdio" || value === "http") {
    return value;
  }

  throw new Error(`Unsupported MOBILE_MCP_TRANSPORT: ${value}`);
}

function parsePort(value: string) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid MOBILE_MCP_PORT: ${value}`);
  }

  return port;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value.toLowerCase())) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

function parseList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function nonEmpty(value: string | undefined) {
  return value && value.trim() !== "" ? value : undefined;
}

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeEqual(left: string | undefined, right: string) {
  if (!left) {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isLocalHost(host: string) {
  return LOCAL_HOSTS.has(host);
}

function defaultAllowedHosts(host: string) {
  return isLocalHost(host) ? DEFAULT_LOCAL_ALLOWED_HOSTS : [];
}
