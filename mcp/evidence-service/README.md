# evidence-service

`evidence-service` is a small Fastify service for collecting mobile automation test evidence from `mobile-automation-mcp`.

It creates one `runId` per test run and stores all evidence under:

```text
artifacts/runs/{runId}/
```

The first version uses the local file system as `ArtifactStorage`.

## Install

```bash
npm install
```

## Start

```bash
npm run dev
```

Default address:

```text
http://127.0.0.1:8790
```

Environment variables:

```bash
PORT=8790
HOST=0.0.0.0
ARTIFACT_ROOT=artifacts/runs
BODY_LIMIT_BYTES=26214400
LOG_LEVEL=info
```

## Build

```bash
npm run build
npm start
```

## Artifact structure

```text
artifacts/runs/{runId}/
  meta.json
  flow.json
  timeline.json
  failure.json
  report.md
  junit.xml
  screenshots/
  page-source/
  logs/
  generated-tests/
  attachments/
```

File and path names are normalized to safe ASCII segments to avoid path traversal and issues with spaces, Chinese characters, or shell-special characters.

Logs, page source, flow payloads, step errors, and failure payloads are sanitized before being written. Common secret-like values such as passwords, tokens, authorization headers, cookies, emails, and phone numbers are redacted.

## API

### 1. Start run

```bash
curl -X POST http://127.0.0.1:8790/evidence/runs/start \
  -H 'content-type: application/json' \
  -d '{
    "name": "Login smoke",
    "taskId": "jira-MOB-123",
    "flowName": "rn-login-smoke",
    "environment": {
      "device": {"platform": "ios", "deviceName": "iPhone 15"},
      "app": {"version": "1.2.3"},
      "gitCommit": "abc123"
    },
    "tags": ["smoke", "login"]
  }'
```

Response:

```json
{
  "data": {
    "runId": "run-20260515T081200Z-3f6c0a9b",
    "rootPath": "/absolute/path/artifacts/runs/run-20260515T081200Z-3f6c0a9b",
    "metaPath": "meta.json"
  }
}
```

### 2. Save flow

```bash
curl -X POST http://127.0.0.1:8790/evidence/runs/{runId}/flow \
  -H 'content-type: application/json' \
  -d '{
    "flow": {
      "name": "Login smoke",
      "steps": [{"action": "tap", "selector": {"strategy": "accessibilityId", "value": "login.submit"}}]
    }
  }'
```

### 3. Save generated Appium test

```bash
curl -X POST http://127.0.0.1:8790/evidence/runs/{runId}/generated-test \
  -H 'content-type: application/json' \
  -d '{
    "fileName": "login-smoke.spec.ts",
    "content": "export async function run() { /* Appium test */ }"
  }'
```

### 4. Record step

```bash
curl -X POST http://127.0.0.1:8790/evidence/runs/{runId}/steps \
  -H 'content-type: application/json' \
  -d '{
    "stepId": "step-1",
    "index": 1,
    "name": "Tap login button",
    "action": "tap",
    "status": "failed",
    "startedAt": "2026-05-15T08:12:00.000Z",
    "endedAt": "2026-05-15T08:12:02.000Z",
    "durationMs": 2000,
    "error": {
      "name": "NoSuchElementError",
      "message": "login.submit was not found"
    }
  }'
```

This updates `timeline.json` continuously.

### 5. Save screenshot

```bash
curl -X POST http://127.0.0.1:8790/evidence/runs/{runId}/screenshots \
  -H 'content-type: application/json' \
  -d '{
    "stepId": "step-1",
    "name": "login button missing",
    "kind": "failure",
    "fileBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB..."
  }'
```

Screenshots are stored under `screenshots/{index}-{kind}-{name}.png` and the relative path is returned.

### 6. Save page source

```bash
curl -X POST http://127.0.0.1:8790/evidence/runs/{runId}/page-source \
  -H 'content-type: application/json' \
  -d '{
    "stepId": "step-1",
    "name": "login-screen",
    "source": "<App><Text password=\"123456\">Login</Text></App>"
  }'
```

Page source is stored under `page-source/{name}.xml`.

### 7. Save logs

```bash
curl -X POST http://127.0.0.1:8790/evidence/runs/{runId}/logs \
  -H 'content-type: application/json' \
  -d '{
    "type": "appium",
    "content": "Authorization: Bearer secret-token\nAppium log content"
  }'
```

Logs are stored under `logs/{type}.log`.

### 8. Save failure

```bash
curl -X POST http://127.0.0.1:8790/evidence/runs/{runId}/failure \
  -H 'content-type: application/json' \
  -d '{
    "failedStep": {"stepId": "step-1", "name": "Tap login button"},
    "previousStep": {"stepId": "step-0", "name": "Open app"},
    "error": {"name": "NoSuchElementError", "message": "login.submit was not found"},
    "beforeFailureScreenshot": "screenshots/000-before-open-app.png",
    "failedScreenshot": "screenshots/001-failure-login-button-missing.png",
    "pageSource": "page-source/login-screen.xml",
    "device": {"platform": "ios", "deviceName": "iPhone 15"},
    "app": {"bundleId": "com.example.app", "version": "1.2.3"},
    "gitCommit": "abc123",
    "network": {"lastRequest": "/login"},
    "relatedFiles": ["src/screens/Login.tsx"]
  }'
```

`failure.json` is designed to be easy for later AI analysis.

### 9. Finish run

```bash
curl -X POST http://127.0.0.1:8790/evidence/runs/{runId}/finish \
  -H 'content-type: application/json' \
  -d '{
    "status": "failed"
  }'
```

This updates `meta.json`, then generates:

- `report.md` with Summary, Failure, Evidence, Reproduce, Environment
- `junit.xml` compatible with common CI systems

If report generation hits an unexpected error, the service still writes fallback `report.md` and `junit.xml` where possible.

## Typical mobile-automation-mcp integration

1. Call `/evidence/runs/start`.
2. Save `flow.json`.
3. For every automation step, call `/steps`.
4. Save screenshots, page source, and logs as they become available.
5. On failure, call `/failure`.
6. In a `finally` block, call `/finish`.
