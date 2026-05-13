import assert from "node:assert/strict";
import {
  isAuthorized,
  parseDeploymentConfig
} from "../src/deploy/config.js";

assert.deepEqual(parseDeploymentConfig({}).transport, "stdio");

assert.equal(
  parseDeploymentConfig({
    MOBILE_MCP_TRANSPORT: "http",
    MOBILE_MCP_HOST: "127.0.0.1",
    MOBILE_MCP_PORT: "0"
  }).port,
  0
);
assert.ok(
  parseDeploymentConfig({
    MOBILE_MCP_TRANSPORT: "http",
    MOBILE_MCP_HOST: "127.0.0.1",
    MOBILE_MCP_PORT: "0"
  }).allowedHosts.includes("127.0.0.1")
);

assert.throws(
  () =>
    parseDeploymentConfig({
      MOBILE_MCP_TRANSPORT: "http",
      MOBILE_MCP_HOST: "0.0.0.0"
    }),
  /MOBILE_MCP_API_KEY is required/
);

const httpConfig = parseDeploymentConfig({
  MOBILE_MCP_TRANSPORT: "http",
  MOBILE_MCP_HOST: "0.0.0.0",
  MOBILE_MCP_API_KEY: "secret",
  MOBILE_MCP_ALLOWED_ORIGINS: "https://qa.example.com,https://ci.example.com",
  MOBILE_MCP_ENABLE_SSE: "false"
});

assert.equal(httpConfig.transport, "http");
assert.equal(httpConfig.apiKey, "secret");
assert.equal(httpConfig.enableSse, false);
assert.deepEqual(httpConfig.allowedOrigins, [
  "https://qa.example.com",
  "https://ci.example.com"
]);

assert.equal(
  isAuthorized(
    {
      authorization: "Bearer secret"
    },
    "secret"
  ),
  true
);
assert.equal(isAuthorized({ "x-api-key": "secret" }, "secret"), true);
assert.equal(isAuthorized({ authorization: "Bearer nope" }, "secret"), false);
assert.equal(isAuthorized({}, undefined), true);

console.log("deployment config test passed.");
