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
    },
    {
      action: "swipe",
      direction: "up",
      percent: 0.8,
      durationMs: 600
    },
    {
      action: "scroll",
      selector: {
        strategy: "accessibilityId",
        value: "settings.logout"
      },
      scrollableSelector: {
        strategy: "accessibilityId",
        value: "settings.scrollView"
      },
      direction: "up",
      maxScrolls: 4
    },
    {
      action: "longPress",
      selector: {
        strategy: "accessibilityId",
        value: "feed.item.1"
      },
      durationMs: 1200
    },
    {
      action: "hideKeyboard",
      keys: ["Done"]
    },
    {
      action: "deepLink",
      url: "demo://orders/123",
      appIdentifier: "com.example.demo",
      waitForLaunch: false
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
assert.match(
  generated.code,
  /await browser\.swipe\(\{"direction":"up","duration":600,"percent":0\.8\}\)/
);
assert.match(
  generated.code,
  /const scrollableElement = await browser\.\$\("~settings\.scrollView"\)/
);
assert.match(
  generated.code,
  /await element\.scrollIntoView\(\{"direction":"up","maxScrolls":4,"scrollableElement":scrollableElement\}\)/
);
assert.match(generated.code, /await element\.longPress\(\{"duration":1200\}\)/);
assert.match(
  generated.code,
  /await browser\.execute\("mobile: hideKeyboard", \{"keys":\["Done"\]\}\)/
);
assert.match(
  generated.code,
  /await browser\.deepLink\("demo:\/\/orders\/123", "com\.example\.demo", false\)/
);
assert.equal(createGeneratedCaseFileName("Login Smoke"), "login-smoke.spec.ts");

console.log("generate_appium_case test passed.");
