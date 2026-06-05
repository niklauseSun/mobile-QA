# device-orchestrator

`device-orchestrator` is a small Fastify service that owns mobile device allocation for `mobile-automation-mcp`.

It does not execute UI automation flows. It manages:

- iOS Simulator devices
- Android Emulator devices
- real iOS/Android devices registered in `devices.json`
- Appium Server health and session cleanup
- Redis-backed distributed device locks

## Requirements

- Node.js 22+
- Redis
- Appium Server per registered device, or a shared Appium Server whose active sessions include reliable `udid`/`deviceName` capabilities
- `adb` for Android native install/reset helpers
- `xcrun simctl` for iOS Simulator install/reset helpers

## Install

```bash
npm install
```

## Start Redis

```bash
docker run --rm -p 6379:6379 redis:7
```

For local route smoke testing without Redis, you can use the in-memory lock mode:

```bash
DEVICE_ORCHESTRATOR_LOCK_MODE=memory npm run dev
```

Use Redis in shared or CI environments.

## Start the service

```bash
npm run dev
```

Default address:

```text
http://127.0.0.1:8787
```

Environment variables:

```bash
PORT=8787
HOST=0.0.0.0
REDIS_URL=redis://127.0.0.1:6379
DEVICE_REGISTRY_PATH=src/config/devices.json
APPIUM_TIMEOUT_MS=5000
LOG_LEVEL=info
```

## Build

```bash
npm run build
npm start
```

## devices.json

The MVP uses a local JSON registry at `src/config/devices.json`.

```json
{
  "devices": [
    {
      "id": "ios-sim-iphone-15-001",
      "platform": "ios",
      "type": "ios-simulator",
      "deviceName": "iPhone 15",
      "osVersion": "17.5",
      "runtimes": ["react-native", "ios-native"],
      "host": "127.0.0.1",
      "appiumServerUrl": "http://127.0.0.1:4723",
      "capabilities": {
        "platformName": "iOS",
        "appium:automationName": "XCUITest",
        "appium:deviceName": "iPhone 15",
        "appium:platformVersion": "17.5",
        "appium:udid": "auto",
        "appium:bundleId": "com.example.app"
      },
      "status": "idle"
    }
  ]
}
```

Supported statuses:

- `idle`
- `leased`
- `unhealthy`

During allocation the service writes `currentLeaseId`, `leaseExpiresAt`, and `leaseTaskId` back to the registry so expired leases can be recovered after a process restart.

## API examples

### Acquire device

```bash
curl -X POST http://127.0.0.1:8787/device/acquire \
  -H 'content-type: application/json' \
  -d '{
    "platform": "ios",
    "deviceName": "iPhone 15",
    "runtime": "react-native",
    "taskId": "jira-MOB-123",
    "leaseTtlMs": 900000
  }'
```

Response:

```json
{
  "data": {
    "leaseId": "4fcfeffc-4bf6-4c81-89f5-2b39590e4cc5",
    "deviceId": "ios-sim-iphone-15-001",
    "host": "127.0.0.1",
    "appiumServerUrl": "http://127.0.0.1:4723",
    "capabilities": {
      "platformName": "iOS",
      "appium:automationName": "XCUITest"
    },
    "expiresAt": "2026-05-15T08:00:00.000Z"
  }
}
```

### Release device

```bash
curl -X POST http://127.0.0.1:8787/device/release \
  -H 'content-type: application/json' \
  -d '{
    "leaseId": "4fcfeffc-4bf6-4c81-89f5-2b39590e4cc5",
    "taskId": "jira-MOB-123"
  }'
```

Release attempts to delete the matching Appium session before returning the device to `idle`. The lock is released in `finally`.

### Health check

Check all devices:

```bash
curl -X POST http://127.0.0.1:8787/device/health_check \
  -H 'content-type: application/json' \
  -d '{"taskId":"manual-health-check"}'
```

Check one device:

```bash
curl -X POST http://127.0.0.1:8787/device/health_check \
  -H 'content-type: application/json' \
  -d '{"deviceId":"android-emu-pixel-8-001","taskId":"manual-health-check"}'
```

If Appium `/status` is not reachable, the device is marked `unhealthy`.

### Install app

```bash
curl -X POST http://127.0.0.1:8787/device/install_app \
  -H 'content-type: application/json' \
  -d '{
    "leaseId": "4fcfeffc-4bf6-4c81-89f5-2b39590e4cc5",
    "appPath": "/tmp/app-debug.apk",
    "taskId": "jira-MOB-123"
  }'
```

Install order:

1. Reuse active Appium session when present.
2. Use `xcrun simctl install` for iOS Simulator.
3. Use `adb install -r` for Android.
4. For real iOS without an active session, create an Appium session with `appium:app`.

### Reset app

```bash
curl -X POST http://127.0.0.1:8787/device/reset_app \
  -H 'content-type: application/json' \
  -d '{
    "leaseId": "4fcfeffc-4bf6-4c81-89f5-2b39590e4cc5",
    "strategy": "restart_app",
    "appId": "com.example.app",
    "taskId": "jira-MOB-123"
  }'
```

Strategies:

- `none`
- `restart_app`
- `clear_data`
- `reinstall_app`
- `reset_device`

`restart_app` requires an active Appium session. `clear_data` and `reinstall_app` can use Appium or native device commands. `reset_device` is implemented for iOS Simulator via `simctl erase` and Android Emulator via `adb emu kill` as an MVP hook for an external emulator supervisor.

### List available devices

```bash
curl http://127.0.0.1:8787/device/list_available
```

Returns devices with `status: "idle"`.

## Logging

Every service log includes the relevant `taskId`, `leaseId`, and `deviceId` when available, so orchestration logs can be traced back to a CI task or Jira issue.

## Notes for mobile-automation-mcp integration

`mobile-automation-mcp` should:

1. Call `/device/acquire`.
2. Use `appiumServerUrl` and `capabilities` to create its Appium session.
3. Run the requested flow.
4. Call `/device/release` in its own `finally` block.

For best cleanup fidelity, run one Appium Server per device or ensure session capabilities expose `udid` or `deviceName`.
