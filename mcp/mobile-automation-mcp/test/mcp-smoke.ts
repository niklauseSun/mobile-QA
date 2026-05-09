import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const client = new Client({
    name: "mobile-automation-mcp-smoke-test",
    version: "0.1.0"
  });

  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"]
  });

  await client.connect(transport);

  try {
    const { tools } = await client.listTools();
    const toolNames = tools.map((tool) => tool.name);

    assert.ok(
      toolNames.includes("mobile_launch_app"),
      `Expected mobile_launch_app tool. Found: ${toolNames.join(", ")}`
    );
    assert.ok(
      toolNames.includes("mobile_describe_screen"),
      `Expected mobile_describe_screen tool. Found: ${toolNames.join(", ")}`
    );
    assert.ok(
      toolNames.includes("mobile_get_contexts"),
      `Expected mobile_get_contexts tool. Found: ${toolNames.join(", ")}`
    );
    assert.ok(
      toolNames.includes("mobile_webview_eval"),
      `Expected mobile_webview_eval tool. Found: ${toolNames.join(", ")}`
    );
    assert.ok(
      toolNames.includes("mobile_generate_appium_case"),
      `Expected mobile_generate_appium_case tool. Found: ${toolNames.join(", ")}`
    );

    console.log(`MCP smoke test passed. tools=${toolNames.length}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
