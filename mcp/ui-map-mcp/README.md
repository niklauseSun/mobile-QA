# ui-map-mcp

`ui-map-mcp` is a TypeScript MCP server that exposes a trusted UI Map for AI-generated mobile and web automation flows.

It lets an agent list screens, inspect elements, search for semantic UI targets, resolve natural-language actions to real platform selectors, and validate selectors before an automation flow uses them.

## Why Selectors Must Come From UI Map

AI-generated flows are useful, but selectors are a contract with the application. If an agent invents selectors like `login.submit` or `[data-testid="checkout"]`, the flow may pass review while still being impossible to run.

`ui-map-mcp` keeps that boundary explicit:

- Agents search by intent, text, aliases, action, or `semanticId`.
- Platform selectors are returned only when they exist in UI Map JSON.
- Missing elements, unsupported actions, or missing platform selectors return unresolved/invalid responses.
- No core function or MCP tool fabricates a selector.

## Installation

```bash
cd /Users/user/code/mobile-qa/mcp/ui-map-mcp
pnpm install
cp .env.example .env
pnpm typecheck
pnpm test
pnpm build
```

## npm Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the MCP server from TypeScript with `tsx`. |
| `pnpm build` | Compile TypeScript to `dist/`. |
| `pnpm start` | Run the compiled MCP server from `dist/index.js`. |
| `pnpm test` | Run Vitest unit tests. |
| `pnpm typecheck` | Run TypeScript without emitting files. |

## Run Locally

Development mode:

```bash
UI_MAP_DIR=./ui-maps pnpm dev
```

Production-style local run:

```bash
pnpm build
UI_MAP_DIR=./ui-maps pnpm start
```

If `UI_MAP_DIR` is not set, the server loads UI Maps from `./ui-maps`.

## UI Map JSON Format

UI Map files must end with `.ui-map.json`. The loader reads every matching file in `UI_MAP_DIR`, validates each file with Zod, and merges them into one registry.

Example:

```json
{
  "screens": {
    "LoginScreen": {
      "name": "LoginScreen",
      "description": "Login screen for existing users.",
      "route": "/login",
      "elements": {
        "submitButton": {
          "semanticId": "LoginScreen.submitButton",
          "description": "Submit login form.",
          "type": "button",
          "aliases": ["sign in", "login", "login button", "登录", "登录按钮"],
          "actions": ["tap", "assertVisible"],
          "platform": {
            "ios": {
              "selectorType": "accessibilityId",
              "selector": "login.submit"
            },
            "android": {
              "selectorType": "accessibilityId",
              "selector": "login.submit"
            },
            "web": {
              "selectorType": "css",
              "selector": "[data-testid='login-submit']"
            }
          }
        }
      }
    }
  }
}
```

Validation rules include:

- `semanticId` must follow `ScreenName.elementName`.
- The screen name in `semanticId` must match the parent screen key or screen `name`.
- `actions` cannot be empty.
- Platform selectors must include both `selectorType` and `selector`.
- `selector` cannot be empty.
- Duplicate screen names and duplicate `semanticId` values are rejected.

Sample UI Map files are included:

- `ui-maps/login.ui-map.json`
- `ui-maps/home.ui-map.json`
- `ui-maps/order.ui-map.json`

## MCP Tools

The server registers these tools:

- `ui.list_screens`
- `ui.get_screen_elements`
- `ui.search_element`
- `ui.get_element_detail`
- `ui.resolve_action_to_selector`
- `ui.validate_selector_exists`

Tool responses are returned as JSON text content.

## Example Tool Inputs And Outputs

### `ui.list_screens`

Input:

```json
{}
```

Output:

```json
{
  "ok": true,
  "screens": [
    {
      "name": "LoginScreen",
      "description": "Login screen for existing users.",
      "route": "/login",
      "elementCount": 3
    }
  ]
}
```

### `ui.get_screen_elements`

Input:

```json
{
  "screen": "LoginScreen",
  "platform": "android"
}
```

Output:

```json
{
  "ok": true,
  "screen": "LoginScreen",
  "elements": [
    {
      "screen": "LoginScreen",
      "key": "submitButton",
      "semanticId": "LoginScreen.submitButton",
      "description": "Submit login form.",
      "type": "button",
      "aliases": ["sign in", "login", "login button", "登录", "登录按钮"],
      "actions": ["tap", "assertVisible"],
      "required": false,
      "selector": {
        "selectorType": "accessibilityId",
        "selector": "login.submit"
      }
    }
  ]
}
```

### `ui.search_element`

Input:

```json
{
  "query": "登录按钮",
  "screen": "LoginScreen",
  "platform": "android"
}
```

Output:

```json
{
  "ok": true,
  "query": "登录按钮",
  "results": [
    {
      "screen": "LoginScreen",
      "key": "submitButton",
      "semanticId": "LoginScreen.submitButton",
      "description": "Submit login form.",
      "type": "button",
      "actions": ["tap", "assertVisible"],
      "selector": {
        "selectorType": "accessibilityId",
        "selector": "login.submit"
      },
      "score": 0
    }
  ]
}
```

### `ui.get_element_detail`

Input:

```json
{
  "semanticId": "LoginScreen.submitButton",
  "platform": "android"
}
```

Output:

```json
{
  "ok": true,
  "element": {
    "screen": "LoginScreen",
    "key": "submitButton",
    "semanticId": "LoginScreen.submitButton",
    "description": "Submit login form.",
    "type": "button",
    "actions": ["tap", "assertVisible"],
    "selector": {
      "selectorType": "accessibilityId",
      "selector": "login.submit"
    },
    "platform": {
      "android": {
        "selectorType": "accessibilityId",
        "selector": "login.submit"
      }
    }
  }
}
```

### `ui.resolve_action_to_selector`

Input:

```json
{
  "screen": "LoginScreen",
  "action": "点击登录",
  "platform": "android"
}
```

Output:

```json
{
  "status": "resolved",
  "action": "tap",
  "semanticId": "LoginScreen.submitButton",
  "screen": "LoginScreen",
  "selector": {
    "selectorType": "accessibilityId",
    "selector": "login.submit"
  },
  "confidence": 1
}
```

Unresolved output:

```json
{
  "status": "unresolved",
  "reason": "selector_not_available",
  "suggestions": [
    {
      "semanticId": "LoginScreen.submitButton",
      "description": "Submit login form.",
      "screen": "LoginScreen"
    }
  ]
}
```

### `ui.validate_selector_exists`

Input:

```json
{
  "semanticId": "LoginScreen.submitButton",
  "platform": "android",
  "action": "tap"
}
```

Output:

```json
{
  "exists": true,
  "semanticId": "LoginScreen.submitButton",
  "selector": {
    "selectorType": "accessibilityId",
    "selector": "login.submit"
  },
  "source": "ui-map"
}
```

Invalid output:

```json
{
  "exists": false,
  "reason": "action_not_supported",
  "suggestions": [
    {
      "semanticId": "LoginScreen.phoneInput",
      "description": "Mobile phone number input.",
      "screen": "LoginScreen"
    }
  ]
}
```

## MCP Client Configuration

Use the compiled server:

```json
{
  "mcpServers": {
    "ui-map-mcp": {
      "command": "pnpm",
      "args": ["--dir", "/Users/user/code/mobile-qa/mcp/ui-map-mcp", "start"],
      "env": {
        "UI_MAP_DIR": "/Users/user/code/mobile-qa/mcp/ui-map-mcp/ui-maps"
      }
    }
  }
}
```

Use the TypeScript dev server:

```json
{
  "mcpServers": {
    "ui-map-mcp": {
      "command": "pnpm",
      "args": ["--dir", "/Users/user/code/mobile-qa/mcp/ui-map-mcp", "dev"],
      "env": {
        "UI_MAP_DIR": "/Users/user/code/mobile-qa/mcp/ui-map-mcp/ui-maps"
      }
    }
  }
}
```

## Add New Screen Elements

1. Open or create a file ending in `.ui-map.json` under `ui-maps/`.
2. Add a screen under `screens`.
3. Add elements under `screen.elements`.
4. Give every element a stable `semanticId` in `ScreenName.elementName` format.
5. Add aliases for natural-language search, including product terms and localized copy.
6. Add only actions the element really supports.
7. Add selectors for each platform that supports the element.
8. Run validation:

```bash
pnpm test
```

Example element:

```json
{
  "semanticId": "OrderScreen.pendingOrderCell",
  "description": "Pending payment order row.",
  "type": "cell",
  "aliases": ["pending order", "unpaid order"],
  "actions": ["tap", "assertVisible"],
  "platform": {
    "android": {
      "selectorType": "resourceId",
      "selector": "com.example:id/order_pending_cell"
    }
  }
}
```

## Troubleshooting

### Server fails to start

Check that dependencies are installed and UI Maps are valid:

```bash
pnpm install
pnpm test
UI_MAP_DIR=./ui-maps pnpm dev
```

### `Failed to load UI Maps`

Confirm `UI_MAP_DIR` points to a directory and contains files ending with `.ui-map.json`.

### `Invalid UI Map file`

Run tests to see Zod validation details:

```bash
pnpm test
```

Common causes:

- Empty `selector`
- Empty `actions`
- `semanticId` does not match `ScreenName.elementName`
- `semanticId` screen prefix does not match the parent screen
- Missing `selectorType` or `selector`

### Duplicate screen or semantic ID errors

Screen keys and `semanticId` values must be unique after all `.ui-map.json` files are merged.

### Tool returns no search results

Add better `aliases` to the element. Search uses `semanticId`, element key, description, aliases, type, and actions.

### Resolver returns `selector_not_available`

The element exists, but the requested platform does not have a selector in UI Map. Add the platform selector or request a platform that is present.

### Validator returns `action_not_supported`

The element exists, but its `actions` array does not include the requested action. Add the action only if the UI element truly supports it.
