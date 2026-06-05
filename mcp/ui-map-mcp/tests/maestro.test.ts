import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { loadUIMapRegistry } from "../src/core/loader.js";
import { UIMapRegistry } from "../src/core/registry.js";
import type { UIMap } from "../src/core/types.js";
import { semanticFlowToMaestro } from "../src/adapters/maestro.js";
import type { SemanticFlow } from "../src/flow/types.js";

const sampleMapsDir = fileURLToPath(new URL("../ui-maps", import.meta.url));

let registry: UIMapRegistry;

beforeAll(async () => {
  registry = await loadUIMapRegistry(sampleMapsDir);
});

describe("semanticFlowToMaestro", () => {
  it("converts a valid Android semantic flow to Maestro YAML", () => {
    const result = semanticFlowToMaestro(registry, validAndroidFlow);

    expect(result).toEqual({
      status: "converted",
      yaml: [
        "- tapOn:",
        "    id: \"com.example:id/login_phone\"",
        "- inputText: \"13800138000\"",
        "- tapOn:",
        "    id: \"login.submit\"",
        "- assertVisible:",
        "    id: \"home.orderEntry\""
      ].join("\n")
    });
  });

  it("uses text when selectorType is text", () => {
    const textRegistry = new UIMapRegistry([textSelectorMap]);
    const result = semanticFlowToMaestro(textRegistry, {
      name: "Text selector flow",
      platform: "android",
      steps: [
        {
          action: "tap",
          target: "LoginScreen.submitButton"
        }
      ]
    });

    expect(result).toEqual({
      status: "converted",
      yaml: ["- tapOn:", "    text: \"登录\""].join("\n")
    });
  });

  it("returns unsupported for XPath selectors", () => {
    const xpathRegistry = new UIMapRegistry([xpathSelectorMap]);
    const result = semanticFlowToMaestro(xpathRegistry, {
      name: "XPath selector flow",
      platform: "android",
      steps: [
        {
          action: "tap",
          target: "LoginScreen.submitButton"
        }
      ]
    });

    expect(result).toMatchObject({
      status: "unsupported",
      reason: "unsupported_selector_type:xpath",
      unsupportedSteps: [
        {
          index: 0,
          target: "LoginScreen.submitButton"
        }
      ]
    });
  });

  it("returns unresolved when a platform selector is missing", () => {
    const androidOnlyRegistry = new UIMapRegistry([androidOnlyMap]);
    const result = semanticFlowToMaestro(androidOnlyRegistry, {
      name: "Missing selector flow",
      platform: "web",
      steps: [
        {
          action: "tap",
          target: "LoginScreen.submitButton"
        }
      ]
    });

    expect(result).toMatchObject({
      status: "unresolved",
      reason: "flow_has_unresolved_steps",
      unresolvedSteps: [
        {
          index: 0,
          action: "tap",
          target: "LoginScreen.submitButton",
          reason: "selector_not_available"
        }
      ]
    });
    expect(JSON.stringify(result)).not.toContain("tapOn");
  });
});

const validAndroidFlow: SemanticFlow = {
  name: "手机号登录流程",
  platform: "android",
  steps: [
    {
      action: "input",
      target: "LoginScreen.phoneInput",
      value: "13800138000"
    },
    {
      action: "tap",
      target: "LoginScreen.submitButton"
    },
    {
      action: "assertVisible",
      target: "HomeScreen.orderEntry"
    }
  ]
};

const textSelectorMap: UIMap = {
  screens: {
    LoginScreen: {
      name: "LoginScreen",
      elements: {
        submitButton: {
          semanticId: "LoginScreen.submitButton",
          description: "Submit login form.",
          type: "button",
          actions: ["tap"],
          platform: {
            android: {
              selectorType: "text",
              selector: "登录"
            }
          }
        }
      }
    }
  }
};

const xpathSelectorMap: UIMap = {
  screens: {
    LoginScreen: {
      name: "LoginScreen",
      elements: {
        submitButton: {
          semanticId: "LoginScreen.submitButton",
          description: "Submit login form.",
          type: "button",
          actions: ["tap"],
          platform: {
            android: {
              selectorType: "xpath",
              selector: "//button[@text='登录']"
            }
          }
        }
      }
    }
  }
};

const androidOnlyMap: UIMap = {
  screens: {
    LoginScreen: {
      name: "LoginScreen",
      elements: {
        submitButton: {
          semanticId: "LoginScreen.submitButton",
          description: "Submit login form.",
          type: "button",
          actions: ["tap"],
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
