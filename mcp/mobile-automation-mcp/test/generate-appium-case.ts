import assert from "node:assert/strict";
import {
  createGeneratedCaseFileName,
  generateAppiumCase
} from "../src/flows/generateAppiumCase.js";

const generated = generateAppiumCase("Login Smoke", {
  name: "login flow",
  platform: "ios",
  runtime: "ios-native",
  steps: [
    {
      action: "tap",
      selector: {
        strategy: "accessibilityId",
        value: "login.submit"
      }
    },
    {
      action: "type",
      selector: {
        strategy: "accessibilityId",
        value: "login.phone"
      },
      text: "13800138000"
    },
    {
      action: "assertText",
      text: "登录成功"
    },
    {
      action: "wait",
      ms: 500
    },
    {
      action: "screenshot",
      name: "login-success"
    },
    {
      action: "back"
    }
  ]
});

assert.match(generated.code, /describe\("Login Smoke"/);
assert.match(generated.code, /await browser\.\$\("~login\.submit"\)/);
assert.match(generated.code, /await element\.setValue\("13800138000"\)/);
assert.match(generated.code, /contains\(@label, \\"登录成功\\"\)/);
assert.match(generated.code, /await browser\.pause\(500\)/);
assert.match(
  generated.code,
  /await browser\.saveScreenshot\("\.\/artifacts\/screenshots\/login-success\.png"\)/
);
assert.match(generated.code, /await browser\.back\(\)/);
assert.equal(createGeneratedCaseFileName("Login Smoke"), "login-smoke.spec.ts");

console.log("generate_appium_case test passed.");
