import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { loadUIMapRegistry } from "../src/core/loader.js";
import { searchElements } from "../src/core/search.js";
import type { UIMapRegistry } from "../src/core/registry.js";

const sampleMapsDir = fileURLToPath(new URL("../ui-maps", import.meta.url));

let registry: UIMapRegistry;

beforeAll(async () => {
  registry = await loadUIMapRegistry(sampleMapsDir);
});

describe("searchElements", () => {
  it('finds LoginScreen.submitButton when searching "登录按钮"', () => {
    const results = searchElements(registry, {
      query: "登录按钮"
    });

    expect(results[0]).toMatchObject({
      screen: "LoginScreen",
      key: "submitButton",
      semanticId: "LoginScreen.submitButton"
    });
  });

  it('finds LoginScreen.phoneInput when searching "手机号"', () => {
    const results = searchElements(registry, {
      query: "手机号"
    });

    expect(results[0]).toMatchObject({
      screen: "LoginScreen",
      key: "phoneInput",
      semanticId: "LoginScreen.phoneInput"
    });
  });

  it("searches only within the requested screen", () => {
    const results = searchElements(registry, {
      query: "orders",
      screen: "LoginScreen"
    });

    expect(results).toEqual([]);
  });

  it("includes the requested platform selector when available", () => {
    const results = searchElements(registry, {
      query: "登录按钮",
      platform: "ios"
    });

    expect(results[0]).toMatchObject({
      semanticId: "LoginScreen.submitButton",
      selector: {
        selectorType: "accessibilityId",
        selector: "login.submit"
      }
    });
  });
});
