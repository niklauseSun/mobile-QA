import assert from "node:assert/strict";
import { mobileFlowSchema } from "../src/flows/schema.js";

const parsed = mobileFlowSchema.parse({
  name: "gesture flow",
  platform: "android",
  runtime: "android-native",
  steps: [
    {
      action: "swipe",
      direction: "up",
      percent: 0.8,
      durationMs: 500
    },
    {
      action: "scroll",
      selector: {
        strategy: "accessibilityId",
        value: "settings.logout"
      },
      direction: "up",
      maxScrolls: 5
    },
    {
      action: "longPress",
      x: 120,
      y: 300,
      durationMs: 1000
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

assert.equal(parsed.steps.length, 5);

assert.throws(() =>
  mobileFlowSchema.parse({
    name: "invalid long press",
    steps: [
      {
        action: "longPress",
        durationMs: 1000
      }
    ]
  })
);

console.log("flow schema test passed.");
