import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const smokeArtifactPath = path.resolve(
    "artifacts",
    "screenshots",
    "mcp-smoke.png"
  );
  await fs.mkdir(path.dirname(smokeArtifactPath), { recursive: true });
  await fs.writeFile(smokeArtifactPath, Buffer.from([1, 2, 3]));

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
    const { resourceTemplates } = await client.listResourceTemplates();
    const resourceTemplateUris = resourceTemplates.map(
      (template) => template.uriTemplate
    );

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
    for (const toolName of [
      "mobile_swipe",
      "mobile_scroll",
      "mobile_long_press",
      "mobile_hide_keyboard",
      "mobile_open_deeplink",
      "mobile_get_session",
      "mobile_session_status",
      "mobile_close_all_sessions",
      "mobile_list_devices",
      "mobile_ui_map",
      "mobile_find_selectors",
      "mobile_list_log_types",
      "mobile_get_device_logs",
      "mobile_read_appium_log"
    ]) {
      assert.ok(
        toolNames.includes(toolName),
        `Expected ${toolName} tool. Found: ${toolNames.join(", ")}`
      );
    }
    assert.ok(
      resourceTemplateUris.includes(
        "mobile-artifact://artifact/{kind}/{artifactPath}"
      ),
      `Expected mobile artifact resource template. Found: ${resourceTemplateUris.join(", ")}`
    );

    const { resources } = await client.listResources();
    const smokeArtifact = resources.find((resource) =>
      resource.uri.includes("mcp-smoke.png")
    );

    assert.ok(
      smokeArtifact,
      `Expected mcp-smoke.png resource. Found: ${resources
        .map((resource) => resource.uri)
        .join(", ")}`
    );

    const artifact = await client.readResource({ uri: smokeArtifact.uri });
    assert.equal(artifact.contents[0].mimeType, "image/png");
    assert.equal("blob" in artifact.contents[0], true);

    console.log(`MCP smoke test passed. tools=${toolNames.length}`);
  } finally {
    await client.close();
    await fs.rm(smokeArtifactPath, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
