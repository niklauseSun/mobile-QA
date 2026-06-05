import { describe, expect, it } from "vitest";

import { UIMapSchema } from "../src/core/schema.js";
import type { UIMap } from "../src/core/types.js";

const validMap: UIMap = {
  screens: {
    LoginScreen: {
      name: "LoginScreen",
      description: "User login screen",
      route: "/login",
      elements: {
        emailInput: {
          semanticId: "LoginScreen.emailInput",
          description: "Email input field",
          type: "input",
          aliases: ["email", "account"],
          actions: ["focus", "input", "clear", "assertVisible"],
          required: true,
          platform: {
            ios: {
              selectorType: "accessibilityId",
              selector: "login.email"
            },
            android: {
              selectorType: "resourceId",
              selector: "com.example:id/login_email"
            },
            web: {
              selectorType: "data-testid",
              selector: "login-email"
            }
          }
        },
        submitButton: {
          semanticId: "LoginScreen.submitButton",
          description: "Submit login form",
          type: "button",
          actions: ["tap", "assertVisible"],
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
};

describe("UIMapSchema", () => {
  it("accepts a valid UI Map", () => {
    const parsed = UIMapSchema.parse(validMap);

    expect(parsed.screens.LoginScreen.elements.emailInput.semanticId).toBe(
      "LoginScreen.emailInput"
    );
  });

  it("rejects semantic ids without ScreenName.elementName format", () => {
    const result = UIMapSchema.safeParse({
      screens: {
        LoginScreen: {
          name: "LoginScreen",
          elements: {
            emailInput: {
              ...validMap.screens.LoginScreen.elements.emailInput,
              semanticId: "emailInput"
            }
          }
        }
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty selectors", () => {
    const result = UIMapSchema.safeParse({
      screens: {
        LoginScreen: {
          name: "LoginScreen",
          elements: {
            emailInput: {
              ...validMap.screens.LoginScreen.elements.emailInput,
              platform: {
                ios: {
                  selectorType: "accessibilityId",
                  selector: ""
                }
              }
            }
          }
        }
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects elements with no actions", () => {
    const result = UIMapSchema.safeParse({
      screens: {
        LoginScreen: {
          name: "LoginScreen",
          elements: {
            emailInput: {
              ...validMap.screens.LoginScreen.elements.emailInput,
              actions: []
            }
          }
        }
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects platform selectors without selectorType", () => {
    const result = UIMapSchema.safeParse({
      screens: {
        LoginScreen: {
          name: "LoginScreen",
          elements: {
            emailInput: {
              ...validMap.screens.LoginScreen.elements.emailInput,
              platform: {
                ios: {
                  selector: "login.email"
                }
              }
            }
          }
        }
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects platform selectors without selector", () => {
    const result = UIMapSchema.safeParse({
      screens: {
        LoginScreen: {
          name: "LoginScreen",
          elements: {
            emailInput: {
              ...validMap.screens.LoginScreen.elements.emailInput,
              platform: {
                ios: {
                  selectorType: "accessibilityId"
                }
              }
            }
          }
        }
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects semantic id screen names that do not match the parent screen", () => {
    const result = UIMapSchema.safeParse({
      screens: {
        LoginScreen: {
          name: "LoginScreen",
          elements: {
            emailInput: {
              ...validMap.screens.LoginScreen.elements.emailInput,
              semanticId: "HomeScreen.emailInput"
            }
          }
        }
      }
    });

    expect(result.success).toBe(false);
  });
});
