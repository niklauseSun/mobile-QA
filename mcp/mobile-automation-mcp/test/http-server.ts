import assert from "node:assert/strict";
import { parseDeploymentConfig } from "../src/deploy/config.js";
import { startHttpServer } from "../src/deploy/httpServer.js";

const handle = await startHttpServer(
  parseDeploymentConfig({
    MOBILE_MCP_TRANSPORT: "http",
    MOBILE_MCP_HOST: "127.0.0.1",
    MOBILE_MCP_PORT: "0",
    MOBILE_MCP_API_KEY: "secret"
  })
);

try {
  const address = handle.server.address();
  assert.equal(typeof address, "object");
  assert.ok(address);

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).authRequired, true);

  const unauthorized = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  });
  assert.equal(unauthorized.status, 401);

  const badMcpRequest = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      authorization: "Bearer secret",
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  });
  assert.equal(badMcpRequest.status, 400);

  const invalidJson = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      authorization: "Bearer secret",
      "content-type": "application/json"
    },
    body: "{"
  });
  assert.equal(invalidJson.status, 400);
  assert.equal((await invalidJson.json()).error.code, "INVALID_JSON");

  const missing = await fetch(`${baseUrl}/missing`, {
    headers: {
      "x-api-key": "secret"
    }
  });
  assert.equal(missing.status, 404);
} finally {
  await handle.close();
}

console.log("http server test passed.");
