import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { loadUIMapRegistry } from "../src/core/loader.js";
import { UIMapRegistry } from "../src/core/registry.js";
import type { UIMap } from "../src/core/types.js";
import { validateSelectorExists } from "../src/core/validator.js";

const sampleMapsDir = fileURLToPath(new URL("../ui-maps", import.meta.url));

let registry: UIMapRegistry;

beforeAll(async () => {
  registry = await loadUIMapRegistry(sampleMapsDir);
});

describe("validateSelectorExists", () => {
  it("returns the UI Map selector when the semanticId and platform exist", () => {
    const result = validateSelectorExists(registry, {
      semanticId: "LoginScreen.submitButton",
      platform: "android",
      action: "tap"
    });

    expect(result).toEqual({
      exists: true,
      semanticId: "LoginScreen.submitButton",
      selector: {
        selectorType: "accessibilityId",
        selector: "login.submit"
      },
      source: "ui-map"
    });
  });

  it("returns false when the semanticId does not exist", () => {
    const result = validateSelectorExists(registry, {
      semanticId: "LoginScreen.missingButton",
      platform: "ios"
    });

    expect(result).toMatchObject({
      exists: false,
      reason: "element_not_found"
    });
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semanticId: "LoginScreen.submitButton",
          screen: "LoginScreen"
        })
      ])
    );
  });

  it("returns false when the platform selector does not exist", () => {
    const missingWebSelectorRegistry = new UIMapRegistry([missingWebSelectorMap]);
    const result = validateSelectorExists(missingWebSelectorRegistry, {
      semanticId: "LoginScreen.submitButton",
      platform: "web"
    });

    expect(result).toMatchObject({
      exists: false,
      reason: "selector_not_available"
    });
    expect(result.suggestions).toEqual([
      {
        semanticId: "LoginScreen.submitButton",
        description: "Submit login form.",
        screen: "LoginScreen"
      }
    ]);
  });

  it("returns false when the element does not support the requested action", () => {
    const result = validateSelectorExists(registry, {
      semanticId: "LoginScreen.submitButton",
      platform: "android",
      action: "input"
    });

    expect(result).toMatchObject({
      exists: false,
      reason: "action_not_supported"
    });
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semanticId: "LoginScreen.phoneInput",
          screen: "LoginScreen"
        })
      ])
    );
  });
});

const missingWebSelectorMap: UIMap = {
  screens: {
    LoginScreen: {
      name: "LoginScreen",
      elements: {
        submitButton: {
          semanticId: "LoginScreen.submitButton",
          description: "Submit login form.",
          type: "button",
          actions: ["tap", "assertVisible"],
          platform: {
            android: {
              selectorType: "accessibilityId",
              selector: "login.submit"
            }
          }
        }
      }
    }
  }
};
