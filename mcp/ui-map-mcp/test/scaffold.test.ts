import { describe, expect, it } from "vitest";

import { createUiMapServer } from "../src/server.js";

describe("ui-map-mcp scaffold", () => {
  it("creates the MCP server", () => {
    expect(createUiMapServer()).toBeDefined();
  });
});
