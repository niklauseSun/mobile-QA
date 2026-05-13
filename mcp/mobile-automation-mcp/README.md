# mobile-automation-mcp

`mobile-automation-mcp` is a TypeScript MCP server for driving mobile apps through Appium and WebDriverIO.

It exposes thin MCP tools for launching a mobile session, tapping and typing into elements, taking screenshots, asserting text, reading page source, and running simple mobile flows. The MVP targets React Native, Android native, and iOS native apps, with early WebView support through Appium context switching.

## What It Does

Use this server when an MCP client needs to control a real device or simulator:

- Launch or attach to an Android or iOS app.
- Tap elements by accessibility id, resource id, text, XPath, iOS predicate, or class chain.
- Type text into inputs.
- Assert that text appears on screen.
- Capture screenshots and page source.
- Run a repeatable flow made of simple mobile steps.
- Save failure evidence for flow runs.
- Generate a WebDriverIO/Appium TypeScript spec from a flow.

Prefer `accessibilityId` selectors whenever possible. They are usually the most stable option across iOS, Android, and React Native.

## Requirements

- Node.js 22 or newer is recommended.
- npm.
- Appium installed globally or otherwise available on `PATH`.
- Android Studio and Android SDK for Android automation.
- Xcode and iOS Simulator for iOS automation.
- Appium drivers for the target platforms:
  - `uiautomator2` for Android.
  - `xcuitest` for iOS.

Install Appium and drivers:

```bash
npm install -g appium
appium driver install uiautomator2
appium driver install xcuitest
```

## Quick Start

From this project directory:

```bash
cd /Users/user/code/mobile-qa/mcp/mobile-automation-mcp
npm install
npm run build
```

Start Appium in a separate terminal:

```bash
npm run appium
```

The MCP server itself uses stdio. Most users start it from an MCP client instead of running it directly.

Production-style command:

```bash
npm run build
npm run start
```

Development command:

```bash
npm run dev
```

If the terminal appears idle after `npm run dev`, that is expected. The process is waiting for MCP protocol messages on stdio.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the MCP server from TypeScript with `tsx`. |
| `npm run dev:http` | Start the TypeScript server over HTTP/SSE. |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm run start` | Start the compiled MCP server. |
| `npm run start:http` | Start the compiled server over HTTP/SSE. |
| `npm run appium` | Start Appium on `127.0.0.1:4723`. |
| `npm run appium:debug` | Start Appium with debug logging. |

## MCP Client Configuration

Example templates are in `examples/mcp/`.

For most stdio MCP clients, use the compiled server:

```json
{
  "mcpServers": {
    "mobile-automation-mcp": {
      "command": "node",
      "args": [
        "/Users/user/code/mobile-qa/mcp/mobile-automation-mcp/dist/index.js"
      ]
    }
  }
}
```

For local development, use npm with `--prefix` so the client does not need a working-directory option:

```json
{
  "mcpServers": {
    "mobile-automation-mcp": {
      "command": "npm",
      "args": [
        "--prefix",
        "/Users/user/code/mobile-qa/mcp/mobile-automation-mcp",
        "run",
        "dev"
      ]
    }
  }
}
```

Build the project before using the compiled config:

```bash
npm run build
```

## Production HTTP, SSE, and Docker

The default transport is still stdio. For production-style deployments, set `MOBILE_MCP_TRANSPORT=http`.

HTTP endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Health check. Does not require an API key. |
| `GET/POST/DELETE /mcp` | MCP Streamable HTTP transport. |
| `GET /sse` | Legacy MCP SSE connection endpoint. |
| `POST /messages?sessionId=...` | Legacy SSE message endpoint. |

Start locally:

```bash
npm run build
MOBILE_MCP_TRANSPORT=http \
MOBILE_MCP_HOST=127.0.0.1 \
MOBILE_MCP_PORT=3000 \
MOBILE_MCP_API_KEY=change-me \
npm run start
```

API key auth accepts either header:

```text
Authorization: Bearer change-me
x-api-key: change-me
```

HTTP environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `MOBILE_MCP_TRANSPORT` | `stdio` | Use `http` for HTTP/SSE deployment. |
| `MOBILE_MCP_HOST` | `127.0.0.1` | Bind address. `0.0.0.0` requires `MOBILE_MCP_API_KEY` unless explicitly allowed. |
| `MOBILE_MCP_PORT` | `3000` | HTTP port. |
| `MOBILE_MCP_API_KEY` | unset | Enables Bearer or `x-api-key` authentication. |
| `MOBILE_MCP_ALLOWED_ORIGINS` | unset | Comma-separated CORS origins. |
| `MOBILE_MCP_ALLOWED_HOSTS` | localhost defaults for local binding | Comma-separated allowed Host headers for DNS rebinding protection. |
| `MOBILE_MCP_ENABLE_HTTP` | `true` | Enable `/mcp`. |
| `MOBILE_MCP_ENABLE_SSE` | `true` | Enable `/sse` and `/messages`. |
| `MOBILE_MCP_ALLOW_INSECURE_HTTP` | `false` | Allows non-local HTTP binding without an API key. Use only on trusted isolated networks. |

Example HTTP client configs:

```text
examples/mcp/streamable-http.json
examples/mcp/legacy-sse.json
examples/.env.production.example
```

Docker image:

```bash
docker build -t mobile-automation-mcp .
docker run --rm \
  -p 3000:3000 \
  -e MOBILE_MCP_API_KEY=change-me \
  mobile-automation-mcp
```

The Docker image runs only this MCP server. Appium, Android emulators, physical devices, and iOS simulators still need to be available from the environment you point `mobile_launch_app.appiumServerUrl` at. For iOS, run Appium on macOS and connect to it from the MCP server; iOS simulators do not run inside this Linux image.

## Tool List

| Tool | Purpose |
| --- | --- |
| `mobile_launch_app` | Create an Appium session and launch or attach to an app. |
| `mobile_get_session` | Return metadata for the current Appium session. |
| `mobile_session_status` | Probe whether the current Appium session is alive. |
| `mobile_list_devices` | List Android devices from adb and iOS simulators from simctl. |
| `mobile_close_session` | Close the current Appium session. |
| `mobile_close_all_sessions` | Close every Appium session managed by this MCP server. |
| `mobile_tap` | Tap a mobile element. |
| `mobile_type_text` | Type text into a mobile input. |
| `mobile_swipe` | Swipe in a direction or between explicit coordinates. |
| `mobile_scroll` | Scroll by swiping, optionally until a target element is visible. |
| `mobile_long_press` | Long press an element or explicit coordinates. |
| `mobile_hide_keyboard` | Hide the on-screen keyboard. |
| `mobile_open_deeplink` | Open a mobile deep link URL with an app package name or bundle ID. |
| `mobile_list_log_types` | List log types exposed by the current Appium session. |
| `mobile_get_device_logs` | Read Android logcat or iOS syslog entries from the current Appium session. |
| `mobile_read_appium_log` | Tail an Appium server log file from this machine. |
| `mobile_screenshot` | Save a screenshot from the current screen. |
| `mobile_assert_text` | Assert that text exists on the current screen. |
| `mobile_get_page_source` | Return or save the current page source XML. |
| `mobile_describe_screen` | Summarize page source into AI-friendly visible elements. |
| `mobile_ui_map` | Build a structured UI map with selector candidates from the current screen. |
| `mobile_find_selectors` | Search the current screen and return stable selector candidates. |
| `mobile_run_flow` | Run a mobile flow DSL. |
| `mobile_generate_appium_case` | Generate a TypeScript WebDriverIO/Appium spec from a flow. |
| `mobile_get_contexts` | List native and WebView contexts. |
| `mobile_switch_context` | Switch to `NATIVE_APP` or a `WEBVIEW` context. |
| `mobile_webview_eval` | Execute JavaScript in the current WebView context. |
| `mobile_webview_tap` | Tap a WebView element by CSS selector. |
| `mobile_webview_type` | Type into a WebView element by CSS selector. |

## Launch Examples

Android native app:

```json
{
  "platform": "android",
  "runtime": "android-native",
  "appiumServerUrl": "http://127.0.0.1:4723",
  "deviceName": "Android Emulator",
  "appPackage": "com.example.app",
  "appActivity": ".MainActivity",
  "noReset": true
}
```

iOS native app:

```json
{
  "platform": "ios",
  "runtime": "ios-native",
  "appiumServerUrl": "http://127.0.0.1:4723",
  "deviceName": "iPhone 15",
  "bundleId": "com.example.app",
  "noReset": true
}
```

React Native app:

```json
{
  "platform": "android",
  "runtime": "rn",
  "appiumServerUrl": "http://127.0.0.1:4723",
  "deviceName": "Android Emulator",
  "appPackage": "com.example.app",
  "appActivity": ".MainActivity",
  "noReset": true
}
```

You can also pass an app file path with `app` instead of attaching by `appPackage` or `bundleId`.

Set `forceNew: true` on `mobile_launch_app` when you want to close the existing MCP-managed Appium session before creating a new one:

```json
{
  "platform": "android",
  "runtime": "android-native",
  "deviceName": "Android Emulator",
  "appPackage": "com.example.app",
  "appActivity": ".MainActivity",
  "forceNew": true
}
```

## Device and Session Management

This server keeps one active mobile session at a time. That matches the current MVP flow model: launch an app, run actions against the active session, then close it. Use these tools to make that lifecycle visible and controllable:

| Tool | Input | Result |
| --- | --- | --- |
| `mobile_list_devices` | `{ "platform": "all", "includeUnavailable": false }` | Returns devices from `adb devices -l` and simulators from `xcrun simctl list devices --json`. |
| `mobile_get_session` | `{}` | Returns active session metadata, including platform, runtime, Appium URL, creation time, and launch config. |
| `mobile_session_status` | `{ "checkPageSource": false }` | Probes Appium status, session capabilities, context, and Android package/activity when applicable. |
| `mobile_close_session` | `{}` | Closes the current active session. |
| `mobile_close_all_sessions` | `{}` | Closes all sessions managed by this server. In the current single-session model, this returns `0` or `1`. |

Examples are in:

```text
examples/tool-calls/list-devices.json
examples/tool-calls/get-session.json
examples/tool-calls/session-status.json
examples/tool-calls/close-all-sessions.json
```

## Selector Strategies

Selectors use this shape:

```json
{
  "strategy": "accessibilityId",
  "value": "login.submit"
}
```

Supported strategies:

| Strategy | Common Use |
| --- | --- |
| `accessibilityId` | Preferred stable selector for RN, iOS, and Android. |
| `testId` | React Native test id style selectors. |
| `resourceId` | Android resource id selectors. |
| `iosPredicate` | iOS predicate string selectors. |
| `iosClassChain` | iOS class chain selectors. |
| `text` | Text-based selector. Useful for simple assertions and discovery. |
| `xpath` | Fallback selector. Use sparingly. |
| `css` | WebView CSS selector. |

The schema accepts all strategies above, but runtime adapters support different subsets. For example, `iosPredicate` and `iosClassChain` are iOS-only, `resourceId` is Android-oriented, and `css` is intended for WebView tools.

Use `mobile_describe_screen` when you need to discover visible labels, accessibility ids, and resource ids from the current screen.

## UI Map and Selector Discovery

Use these tools when you do not yet know the best selector for an element:

| Tool | Input | Result |
| --- | --- | --- |
| `mobile_ui_map` | `{ "includeInvisible": false, "maxElements": 100 }` | Returns visible UI elements, hierarchy hints, bounds, and ranked selector candidates. |
| `mobile_find_selectors` | `{ "query": "登录", "exact": false }` | Searches text, accessibility id, resource id, role, class name, and bounds, then returns candidates for matching elements. |

Selector candidates are ranked to prefer stable selectors:

1. `accessibilityId`
2. React Native `testId` when runtime is `rn`
3. Android `resourceId`
4. iOS predicate
5. Visible `text`
6. XPath fallback

Examples are in:

```text
examples/tool-calls/ui-map.json
examples/tool-calls/find-selectors.json
```

## Flow DSL

`mobile_run_flow` expects this wrapper:

```json
{
  "flow": {
    "name": "android-login-smoke",
    "platform": "android",
    "runtime": "android-native",
    "steps": []
  }
}
```

Supported flow steps:

```json
{ "action": "tap", "selector": { "strategy": "accessibilityId", "value": "login.submit" } }
```

```json
{ "action": "type", "selector": { "strategy": "accessibilityId", "value": "login.phoneInput" }, "text": "13800000000" }
```

```json
{ "action": "assertText", "text": "Home" }
```

```json
{ "action": "wait", "ms": 1000 }
```

```json
{ "action": "screenshot", "name": "home" }
```

```json
{ "action": "back" }
```

```json
{ "action": "swipe", "direction": "up", "percent": 0.8, "durationMs": 600 }
```

```json
{
  "action": "scroll",
  "selector": {
    "strategy": "accessibilityId",
    "value": "settings.logout"
  },
  "direction": "up",
  "maxScrolls": 4
}
```

```json
{
  "action": "longPress",
  "selector": {
    "strategy": "accessibilityId",
    "value": "feed.item.1"
  },
  "durationMs": 1200
}
```

```json
{ "action": "hideKeyboard", "keys": ["Done"] }
```

```json
{
  "action": "deepLink",
  "url": "demo://orders/123",
  "appIdentifier": "com.example.app",
  "waitForLaunch": true
}
```

Gesture directions are `up`, `down`, `left`, and `right`. Coordinate gestures use screen coordinates:

```json
{
  "action": "swipe",
  "from": { "x": 300, "y": 900 },
  "to": { "x": 300, "y": 300 },
  "durationMs": 700
}
```

Flow examples are in `examples/flows/`.

Example flow call:

```json
{
  "flow": {
    "name": "android-login-smoke",
    "platform": "android",
    "runtime": "android-native",
    "steps": [
      {
        "action": "tap",
        "selector": {
          "strategy": "accessibilityId",
          "value": "login.phoneInput"
        }
      },
      {
        "action": "type",
        "selector": {
          "strategy": "accessibilityId",
          "value": "login.phoneInput"
        },
        "text": "13800000000"
      },
      {
        "action": "tap",
        "selector": {
          "strategy": "accessibilityId",
          "value": "login.submit"
        }
      },
      {
        "action": "assertText",
        "text": "Home"
      },
      {
        "action": "screenshot",
        "name": "home"
      }
    ]
  }
}
```

Call `mobile_launch_app` before `mobile_run_flow`, and call `mobile_close_session` when finished.

## WebView Usage

WebView tools are separate from `mobile_run_flow` for now.

Typical sequence:

1. Call `mobile_launch_app`.
2. Navigate the app to a screen containing a WebView.
3. Call `mobile_get_contexts`.
4. Call `mobile_switch_context` with a `WEBVIEW...` context.
5. Use `mobile_webview_eval`, `mobile_webview_tap`, or `mobile_webview_type`.
6. Switch back to `NATIVE_APP` when returning to native controls.

See `examples/tool-calls/webview-smoke.json`.

## Gesture and App Control Examples

Standalone tool-call examples are in `examples/tool-calls/`.

Swipe:

```json
{
  "direction": "up",
  "percent": 0.8,
  "durationMs": 600
}
```

Scroll until an element is visible:

```json
{
  "selector": {
    "strategy": "accessibilityId",
    "value": "settings.logout"
  },
  "direction": "up",
  "maxScrolls": 4,
  "timeoutMs": 10000
}
```

Long press:

```json
{
  "selector": {
    "strategy": "accessibilityId",
    "value": "feed.item.1"
  },
  "durationMs": 1200
}
```

Hide keyboard:

```json
{
  "keys": ["Done"]
}
```

Open deep link:

```json
{
  "url": "demo://orders/123",
  "appIdentifier": "com.example.app",
  "waitForLaunch": true
}
```

## Logs

Use these tools when debugging app or automation failures:

| Tool | Input | Result |
| --- | --- | --- |
| `mobile_list_log_types` | `{}` | Returns log types exposed by the current Appium driver. If the driver does not expose the command, returns the platform default. |
| `mobile_get_device_logs` | `{ "type": "logcat", "maxEntries": 200 }` | Reads device logs through the current Appium session. Defaults to `logcat` on Android and `syslog` on iOS. |
| `mobile_read_appium_log` | `{ "path": "artifacts/logs/appium.log", "maxLines": 200 }` | Tails a `.log` or `.txt` Appium server log file from disk. |

Device logs can be filtered, redacted, and saved:

```json
{
  "type": "logcat",
  "filter": "com.example.app",
  "maxEntries": 200,
  "redact": true,
  "saveToFile": true
}
```

`redact` defaults to `true` and masks common secrets such as authorization bearer tokens, passwords, API keys, and token-like fields. Saved device logs default to:

```text
artifacts/logs/
```

Examples are in:

```text
examples/tool-calls/list-log-types.json
examples/tool-calls/get-device-logs.json
examples/tool-calls/read-appium-log.json
```

## Artifacts

Flow runs create artifacts under:

```text
artifacts/runs/<timestamp>/
```

Each run includes:

- `flow.json`: The flow that was executed.
- `report.md`: A human-readable step report.
- `junit.xml`: A JUnit report for CI systems.
- `screenshots/`: Screenshots requested by flow steps and failure screenshots.
- `page-source/`: Page source captured on failure.

Standalone screenshots default to:

```text
artifacts/screenshots/
```

Standalone page source files default to:

```text
artifacts/page-source/
```

## MCP Resources

Saved artifacts are also exposed through MCP resources, so clients can discover and read them without parsing local file paths.

Resource template:

```text
mobile-artifact://artifact/{kind}/{artifactPath}
```

Supported `kind` values:

| Kind | Files Exposed | Read Result |
| --- | --- | --- |
| `screenshot` | `artifacts/screenshots/*.png` and flow screenshots under `artifacts/runs/**/screenshots/*.png` | `blob` with `image/png` |
| `page-source` | `artifacts/page-source/*.xml` and failure source under `artifacts/runs/**/page-source/*.xml` | `text` with `application/xml` |
| `report` | `artifacts/runs/**/report.md` and `artifacts/runs/**/junit.xml` | `text` with `text/markdown` or `application/xml` |
| `log` | `artifacts/logs/*.log` and logs under `artifacts/runs/**/logs/*.log` | `text` with `text/plain` |

Example resource URIs:

```text
mobile-artifact://artifact/screenshot/screenshots%2Fhome-1770000000000.png
mobile-artifact://artifact/page-source/page-source%2Fsource-1770000000000.xml
mobile-artifact://artifact/report/runs%2F2026-05-12T10-00-00-000Z%2Freport.md
mobile-artifact://artifact/report/runs%2F2026-05-12T10-00-00-000Z%2Fjunit.xml
mobile-artifact://artifact/log/logs%2Flogcat-1770000000000.log
```

`mobile_screenshot`, `mobile_get_page_source` with `saveToFile: true`, `mobile_get_device_logs` with `saveToFile: true`, and `mobile_run_flow` return resource URIs when they save files under `artifacts/`.

If a client does not show a newly saved artifact immediately, refresh MCP resources with `resources/list`; the server enumerates the `artifacts/` directory on demand.

## Troubleshooting

### No active mobile session

Call `mobile_launch_app` before any interaction tool.

### Could not connect to Appium

Start Appium first:

```bash
npm run appium
```

Check that the URL passed to `mobile_launch_app` matches the running server, usually `http://127.0.0.1:4723`.

### Android emulator is not found

Start an emulator in Android Studio or connect a device, then confirm it is visible:

```bash
adb devices
```

### iOS simulator is not found

Start the target simulator from Xcode or Simulator.app. Make sure the `deviceName` in `mobile_launch_app` matches an available simulator.

### Element not found

Use `mobile_describe_screen` or `mobile_get_page_source` to inspect available elements. Prefer adding stable accessibility ids in the app over relying on XPath.

### WebView context is missing

Make sure the app is currently showing a WebView and that the platform WebView debugging requirements are met. Then call `mobile_get_contexts` again.

## Project Structure

```text
src/
  index.ts
  server.ts
  appium/
  selectors/
  adapters/
  flows/
  tools/
  evidence/
  reports/
  screen/
  webview/
examples/
  flows/
  mcp/
  tool-calls/
```

## Notes

- Keep tool handlers thin.
- Keep Appium session logic in `src/appium`.
- Keep selector translation in `src/adapters`.
- Keep flow execution in `src/flows`.
- Do not hardcode real app packages, bundle ids, device names, test accounts, or credentials in committed examples.
