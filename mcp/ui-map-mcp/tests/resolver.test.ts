import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { loadUIMapRegistry } from "../src/core/loader.js";
import { resolveActionToSelector } from "../src/core/resolver.js";
import { UIMapRegistry } from "../src/core/registry.js";
import type { UIMap } from "../src/core/types.js";

const sampleMapsDir = fileURLToPath(new URL("../ui-maps", import.meta.url));

let registry: UIMapRegistry;

beforeAll(async () => {
  registry = await loadUIMapRegistry(sampleMapsDir);
});

describe("resolveActionToSelector", () => {
  it('resolves "点击登录" on Android to LoginScreen.submitButton', () => {
    const result = resolveActionToSelector(registry, {
      action: "点击登录",
      platform: "android"
    });

    expect(result).toMatchObject({
      status: "resolved",
      action: "tap",
      semanticId: "LoginScreen.submitButton",
      screen: "LoginScreen",
      selector: {
        selectorType: "accessibilityId",
        selector: "login.submit"
      }
    });
  });

  it('resolves "输入手机号" on iOS to LoginScreen.phoneInput', () => {
    const result = resolveActionToSelector(registry, {
      action: "输入手机号",
      platform: "ios"
    });

    expect(result).toMatchObject({
      status: "resolved",
      action: "input",
      semanticId: "LoginScreen.phoneInput",
      screen: "LoginScreen",
      selector: {
        selectorType: "accessibilityId",
        selector: "login.phone"
      }
    });
  });

  it("returns unresolved when the matched element does not support the action", () => {
    const result = resolveActionToSelector(registry, {
      action: "输入登录按钮",
      platform: "android"
    });

    expect(result).toMatchObject({
      status: "unresolved",
      reason: "action_not_supported"
    });
    expect(result.suggestions[0]).toMatchObject({
      semanticId: "LoginScreen.submitButton",
      screen: "LoginScreen"
    });
  });

  it("returns unresolved when the matched element has no platform selector", () => {
    const missingWebSelectorRegistry = new UIMapRegistry([missingWebSelectorMap]);
    const result = resolveActionToSelector(missingWebSelectorRegistry, {
      action: "点击登录",
      platform: "web"
    });

    expect(result).toMatchObject({
      status: "unresolved",
      reason: "selector_not_available"
    });
    expect(result.suggestions[0]).toMatchObject({
      semanticId: "LoginScreen.submitButton",
      screen: "LoginScreen"
    });
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
          aliases: ["login", "登录", "登录按钮"],
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
