# AGENTS.md

## Project Goal

Build a TypeScript MCP server named `mobile-automation-mcp`.

This MCP server controls iOS and Android mobile apps through Appium/WebDriverIO.

It should support:
- React Native apps
- Android native apps
- iOS native apps
- Later: Hybrid WebView apps

The first MVP only needs:
- mobile.launch_app
- mobile.close_session
- mobile.tap
- mobile.type_text
- mobile.screenshot
- mobile.assert_text
- mobile.get_page_source
- mobile.run_flow

## Tech Stack

Use:
- TypeScript
- Node.js ESM
- @modelcontextprotocol/sdk
- webdriverio
- zod

Do not use:
- Puppeteer
- Playwright
- Jest unless tests are explicitly requested

## Architecture

Use this structure:

src/
  index.ts
  server.ts
  appium/
    session.ts
    capabilities.ts
  selectors/
    types.ts
  adapters/
    MobileAdapter.ts
    RNAdapter.ts
    AndroidNativeAdapter.ts
    IOSNativeAdapter.ts
    factory.ts
  flows/
    types.ts
    runner.ts
  tools/
    launchApp.ts
    closeSession.ts
    tap.ts
    typeText.ts
    screenshot.ts
    assertText.ts
    getPageSource.ts
    runFlow.ts
  evidence/
    artifact.ts

## Coding Rules

- Keep tools thin.
- Put Appium session logic in src/appium.
- Put selector translation logic in src/adapters.
- Put flow execution logic in src/flows.
- All tool inputs must use zod schemas.
- Use accessibilityId as the preferred selector strategy.
- Do not hardcode app package, bundle id, device name, or test account.
- Return clear MCP text results.
- On flow failure, save screenshot and page source.
- Keep the MVP simple and runnable.

## Validation

After implementation:
- npm install should work
- npm run build should pass
- npm run dev should start the MCP server
- The MCP server should expose all MVP tools