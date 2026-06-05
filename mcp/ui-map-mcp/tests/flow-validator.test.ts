import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { loadUIMapRegistry } from "../src/core/loader.js";
import { UIMapRegistry } from "../src/core/registry.js";
import type { UIMap } from "../src/core/types.js";
import { SemanticFlowSchema } from "../src/flow/schema.js";
import type { SemanticFlow } from "../src/flow/types.js";
import { validateSemanticFlow } from "../src/flow/validator.js";

const sampleMapsDir = fileURLToPath(new URL("../ui-maps", import.meta.url));

let registry: UIMapRegistry;

beforeAll(async () => {
  registry = await loadUIMapRegistry(sampleMapsDir);
});

describe("validateSemanticFlow", () => {
  it("validates a semantic flow without generating concrete selectors", () => {
    const result = validateSemanticFlow(registry, validLoginFlow);

    expect(result.valid).toBe(true);
    expect(result.unresolvedSteps).toEqual([]);
    expect(result.steps).toEqual([
      {
        index: 0,
        action: "input",
        target: "LoginScreen.phoneInput",
        value: "13800138000"
      },
      {
        index: 1,
        action: "tap",
        target: "LoginScreen.submitButton"
      },
      {
        index: 2,
        action: "assertVisible",
        target: "HomeScreen.orderEntry"
      }
    ]);
    expect(JSON.stringify(result)).not.toContain("selectorType");
  });

  it("returns an unresolved step when a target does not exist", () => {
    const result = validateSemanticFlow(registry, {
      ...validLoginFlow,
      steps: [
        {
          action: "tap",
          target: "LoginScreen.missingButton"
        }
      ]
    });

    expect(result).toMatchObject({
      valid: false,
      unresolvedSteps: [
        {
          index: 0,
          action: "tap",
          target: "LoginScreen.missingButton",
          reason: "element_not_found"
        }
      ]
    });
  });

  it("returns an unresolved step when a platform selector is missing", () => {
    const result = validateSemanticFlow(new UIMapRegistry([androidOnlyMap]), {
      name: "Web login flow",
      platform: "web",
      steps: [
        {
          action: "tap",
          target: "LoginScreen.submitButton"
        }
      ]
    });

    expect(result).toMatchObject({
      valid: false,
      unresolvedSteps: [
        {
          index: 0,
          action: "tap",
          target: "LoginScreen.submitButton",
          reason: "selector_not_available"
        }
      ]
    });
  });

  it("returns an unresolved step when the target does not support the action", () => {
    const result = validateSemanticFlow(registry, {
      ...validLoginFlow,
      steps: [
        {
          action: "input",
          target: "LoginScreen.submitButton",
          value: "not valid"
        }
      ]
    });

    expect(result).toMatchObject({
      valid: false,
      unresolvedSteps: [
        {
          index: 0,
          action: "input",
          target: "LoginScreen.submitButton",
          reason: "action_not_supported"
        }
      ]
    });
  });

  it("rejects concrete selectors in semantic flow steps", () => {
    const result = SemanticFlowSchema.safeParse({
      ...validLoginFlow,
      steps: [
        {
          action: "tap",
          target: "LoginScreen.submitButton",
          selector: {
            selectorType: "accessibilityId",
            selector: "login.submit"
          }
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});

const validLoginFlow: SemanticFlow = {
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

const androidOnlyMap: UIMap = {
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
