import http, {
  type IncomingMessage,
  type Server,
  type ServerResponse
} from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMobileAutomationServer } from "../server.js";
import {
  type DeploymentConfig,
  isAuthorized,
  isHostAllowed,
  isOriginAllowed
} from "./config.js";

interface HttpServerHandle {
  server: Server;
  close: () => Promise<void>;
}

interface StreamableEntry {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}

interface SseEntry {
  transport: SSEServerTransport;
  server: McpServer;
}

const MAX_JSON_BODY_BYTES = 1024 * 1024;

export async function startHttpServer(
  config: DeploymentConfig
): Promise<HttpServerHandle> {
  const streamableTransports = new Map<string, StreamableEntry>();
  const sseTransports = new Map<string, SseEntry>();

  const server = http.createServer(async (req, res) => {
    applyBaseHeaders(req, res, config);

    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (!isHostAllowed(req.headers.host, config.allowedHosts)) {
        writeJson(res, 403, {
          error: {
            code: "INVALID_HOST",
            message: "Host header is not allowed."
          }
        });
        return;
      }

      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

      if (url.pathname === "/health") {
        writeJson(res, 200, {
          ok: true,
          name: "mobile-automation-mcp",
          transport: "http",
          authRequired: Boolean(config.apiKey),
          endpoints: {
            streamableHttp: config.enableStreamableHttp ? "/mcp" : undefined,
            sse: config.enableSse ? "/sse" : undefined,
            sseMessages: config.enableSse ? "/messages" : undefined
          }
        });
        return;
      }

      if (!isAuthorized(req.headers, config.apiKey)) {
        writeJson(res, 401, {
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid API key."
          }
        });
        return;
      }

      if (url.pathname === "/mcp") {
        await handleStreamableHttpRequest(
          req,
          res,
          config,
          streamableTransports
        );
        return;
      }

      if (url.pathname === "/sse") {
        await handleSseRequest(req, res, config, sseTransports);
        return;
      }

      if (url.pathname === "/messages") {
        await handleSseMessageRequest(req, res, url, sseTransports);
        return;
      }

      writeJson(res, 404, {
        error: {
          code: "NOT_FOUND",
          message: "Endpoint not found."
        }
      });
    } catch (error) {
      if (!res.headersSent) {
        if (error instanceof HttpResponseError) {
          writeJson(res, error.statusCode, {
            error: {
              code: error.code,
              message: error.message
            }
          });
          return;
        }

        writeJson(res, 500, {
          error: {
            code: "INTERNAL_ERROR",
            message: "Internal server error."
          }
        });
      }

      console.error("[mobile-automation-mcp] HTTP transport error", error);
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  console.error(
    `[mobile-automation-mcp] HTTP server listening on http://${config.host}:${addressPort(server)}`
  );

  return {
    server,
    close: async () => {
      await Promise.all(
        [...streamableTransports.values()].map((entry) => entry.server.close())
      );
      await Promise.all([...sseTransports.values()].map((entry) => entry.server.close()));
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}

async function handleStreamableHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: DeploymentConfig,
  transports: Map<string, StreamableEntry>
) {
  if (!config.enableStreamableHttp) {
    writeJson(res, 404, {
      error: {
        code: "DISABLED",
        message: "Streamable HTTP transport is disabled."
      }
    });
    return;
  }

  if (!["GET", "POST", "DELETE"].includes(req.method ?? "")) {
    writeJsonRpcError(res, 405, -32000, "Method not allowed.");
    return;
  }

  const parsedBody = req.method === "POST" ? await readJsonBody(req) : undefined;
  const sessionId = firstHeader(req.headers["mcp-session-id"]);
  let entry: StreamableEntry | undefined;

  if (sessionId) {
    entry = transports.get(sessionId);

    if (!entry) {
      writeJsonRpcError(res, 404, -32000, "Session not found.");
      return;
    }
  } else if (req.method === "POST" && isInitializeBody(parsedBody)) {
    const server = createMobileAutomationServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      allowedHosts: config.allowedHosts,
      allowedOrigins: config.allowedOrigins,
      enableDnsRebindingProtection:
        config.allowedHosts.length > 0 || config.allowedOrigins.length > 0,
      onsessioninitialized: (newSessionId) => {
        transports.set(newSessionId, entry as StreamableEntry);
      },
      onsessionclosed: async (closedSessionId) => {
        const existing = transports.get(closedSessionId);
        transports.delete(closedSessionId);
        await existing?.server.close();
      }
    });

    entry = { transport, server };
    transport.onclose = async () => {
      const closedSessionId = transport.sessionId;
      if (closedSessionId) {
        transports.delete(closedSessionId);
      }
      await server.close();
    };
    await server.connect(transport);
  } else {
    writeJsonRpcError(res, 400, -32000, "No valid MCP session ID provided.");
    return;
  }

  await entry.transport.handleRequest(req, res, parsedBody);
}

async function handleSseRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: DeploymentConfig,
  transports: Map<string, SseEntry>
) {
  if (!config.enableSse) {
    writeJson(res, 404, {
      error: {
        code: "DISABLED",
        message: "SSE transport is disabled."
      }
    });
    return;
  }

  if (req.method !== "GET") {
    writeJson(res, 405, {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "SSE endpoint requires GET."
      }
    });
    return;
  }

  const server = createMobileAutomationServer();
  const transport = new SSEServerTransport("/messages", res, {
    allowedHosts: config.allowedHosts,
    allowedOrigins: config.allowedOrigins,
    enableDnsRebindingProtection:
      config.allowedHosts.length > 0 || config.allowedOrigins.length > 0
  });

  transports.set(transport.sessionId, { transport, server });
  res.on("close", async () => {
    transports.delete(transport.sessionId);
    await server.close();
  });
  await server.connect(transport);
}

async function handleSseMessageRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  transports: Map<string, SseEntry>
) {
  if (req.method !== "POST") {
    writeJson(res, 405, {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "SSE message endpoint requires POST."
      }
    });
    return;
  }

  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    writeJson(res, 400, {
      error: {
        code: "MISSING_SESSION_ID",
        message: "Missing sessionId query parameter."
      }
    });
    return;
  }

  const entry = transports.get(sessionId);

  if (!entry) {
    writeJson(res, 404, {
      error: {
        code: "SESSION_NOT_FOUND",
        message: "SSE session not found."
      }
    });
    return;
  }

  const parsedBody = await readJsonBody(req);
  await entry.transport.handlePostMessage(req, res, parsedBody);
}

function applyBaseHeaders(
  req: IncomingMessage,
  res: ServerResponse,
  config: DeploymentConfig
) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

  const origin = firstHeader(req.headers.origin);
  if (origin && isOriginAllowed(origin, config.allowedOrigins)) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      config.allowedOrigins.includes("*") ? "*" : origin
    );
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      [
        "authorization",
        "content-type",
        "last-event-id",
        "mcp-protocol-version",
        "mcp-session-id",
        "x-api-key"
      ].join(", ")
    );
  }
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > MAX_JSON_BODY_BYTES) {
      throw new HttpResponseError(
        413,
        "REQUEST_BODY_TOO_LARGE",
        "Request body is too large."
      );
    }

    chunks.push(buffer);
  }

  const body = Buffer.concat(chunks).toString("utf-8").trim();

  if (!body) {
    return undefined;
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new HttpResponseError(400, "INVALID_JSON", "Request body is not valid JSON.");
  }
}

function isInitializeBody(body: unknown) {
  return Array.isArray(body) ? body.some(isInitializeRequest) : isInitializeRequest(body);
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(body));
}

function writeJsonRpcError(
  res: ServerResponse,
  statusCode: number,
  code: number,
  message: string
) {
  writeJson(res, statusCode, {
    jsonrpc: "2.0",
    error: {
      code,
      message
    },
    id: null
  });
}

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function addressPort(server: Server) {
  const address = server.address();
  return typeof address === "object" && address ? address.port : "?";
}

class HttpResponseError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}
