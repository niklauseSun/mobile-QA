import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  formatDeviceLogs,
  readAppiumLogFile,
  redactLogText
} from "../src/logs/collector.js";

assert.equal(
  redactLogText(
    'Authorization: Bearer abc.def.ghi password=secret token: "12345"'
  ),
  'Authorization: <redacted> password=<redacted> token: "<redacted>"'
);

const formatted = formatDeviceLogs(
  "logcat",
  [
    {
      timestamp: 1710000000000,
      level: "INFO",
      message: "Boot complete"
    },
    {
      timestamp: 1710000005000,
      level: "ERROR",
      message: "Login failed password=hunter2"
    },
    "plain text token=abc123"
  ],
  {
    filter: "login",
    maxEntries: 10
  }
);

assert.deepEqual(formatted, {
  type: "logcat",
  count: 1,
  totalCount: 3,
  truncated: false,
  redacted: true,
  entries: [
    {
      timestamp: 1710000005000,
      level: "ERROR",
      message: "Login failed password=<redacted>"
    }
  ]
});

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mobile-logs-"));
const logPath = path.join(tempRoot, "appium.log");

await fs.writeFile(
  logPath,
  [
    "line 1",
    "[Appium] Starting server",
    "[HTTP] Authorization: Bearer super-secret",
    "[debug] password=abc"
  ].join("\n"),
  "utf-8"
);

const appiumLog = await readAppiumLogFile(logPath, {
  maxLines: 2,
  filter: "password"
});

assert.equal(appiumLog.path, path.resolve(logPath));
assert.equal(appiumLog.lineCount, 1);
assert.deepEqual(appiumLog.lines, ["[debug] password=<redacted>"]);
assert.equal(appiumLog.redacted, true);

await fs.rm(tempRoot, { recursive: true, force: true });

console.log("logs collector test passed.");
