import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadUIMapRegistry } from "../src/core/loader.js";
import type { UIMap } from "../src/core/types.js";

const sampleMapsDir = fileURLToPath(new URL("../ui-maps", import.meta.url));

const validLoginMap: UIMap = {
  screens: {
    LoginScreen: {
      name: "LoginScreen",
      elements: {
        emailInput: {
          semanticId: "LoginScreen.emailInput",
          description: "Email address input.",
          type: "input",
          actions: ["focus", "input", "clear", "assertVisible"],
          platform: {
            ios: {
              selectorType: "accessibilityId",
              selector: "login.email"
            }
          }
        }
      }
    }
  }
};

describe("loadUIMapRegistry", () => {
  it("loads valid UI Maps from *.ui-map.json files", async () => {
    const registry = await loadUIMapRegistry(sampleMapsDir);

    expect(registry.listScreens()).toEqual([
      "HomeScreen",
      "LoginScreen",
      "OrderScreen"
    ]);
    expect(registry.getScreenElements("LoginScreen")).toHaveLength(3);
    expect(registry.hasElement("OrderScreen.pendingOrderCell")).toBe(true);
  });

  it("rejects invalid UI Maps", async () => {
    const directory = await createTempMapDirectory();
    await writeJson(path.join(directory, "invalid.ui-map.json"), {
      screens: {
        LoginScreen: {
          name: "LoginScreen",
          elements: {
            emailInput: {
              ...validLoginMap.screens.LoginScreen.elements.emailInput,
              actions: []
            }
          }
        }
      }
    });

    await expect(loadUIMapRegistry(directory)).rejects.toThrow(
      /Invalid UI Map file .*invalid\.ui-map\.json/
    );
  });

  it("rejects duplicate screens", async () => {
    const directory = await createTempMapDirectory();
    await writeJson(path.join(directory, "login-a.ui-map.json"), validLoginMap);
    await writeJson(path.join(directory, "login-b.ui-map.json"), {
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
                ios: {
                  selectorType: "accessibilityId",
                  selector: "login.submit"
                }
              }
            }
          }
        }
      }
    });

    await expect(loadUIMapRegistry(directory)).rejects.toThrow(
      "Duplicate screen name: LoginScreen"
    );
  });

  it("rejects duplicate semantic ids", async () => {
    const directory = await createTempMapDirectory();
    await writeJson(path.join(directory, "duplicate-elements.ui-map.json"), {
      screens: {
        LoginScreen: {
          name: "LoginScreen",
          elements: {
            emailInput: validLoginMap.screens.LoginScreen.elements.emailInput,
            emailField: {
              ...validLoginMap.screens.LoginScreen.elements.emailInput,
              description: "Duplicate email input semantic id."
            }
          }
        }
      }
    });

    await expect(loadUIMapRegistry(directory)).rejects.toThrow(
      "Duplicate semanticId: LoginScreen.emailInput"
    );
  });

  it("finds elements by semanticId", async () => {
    const registry = await loadUIMapRegistry(sampleMapsDir);

    expect(registry.getElementBySemanticId("LoginScreen.submitButton")).toMatchObject(
      {
        semanticId: "LoginScreen.submitButton",
        type: "button"
      }
    );
    expect(registry.getElementBySemanticId("MissingScreen.nope")).toBeUndefined();
  });
});

async function createTempMapDirectory(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "ui-map-mcp-"));
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}
