import path from "node:path";

import { loadUIMapRegistry } from "../src/core/loader.js";
import { resolveActionToSelector } from "../src/core/resolver.js";
import { searchElements } from "../src/core/search.js";
import { validateSelectorExists } from "../src/core/validator.js";

async function main() {
  const uiMapDir = path.resolve(process.env.UI_MAP_DIR ?? "./ui-maps");
  const registry = await loadUIMapRegistry(uiMapDir);

  const output = {
    uiMapDir,
    screens: registry.listScreens(),
    searchLoginButton: searchElements(registry, {
      query: "登录按钮"
    }),
    resolveTapLoginAndroid: resolveActionToSelector(registry, {
      action: "点击登录",
      platform: "android"
    }),
    validateLoginSubmitAndroidTap: validateSelectorExists(registry, {
      semanticId: "LoginScreen.submitButton",
      platform: "android",
      action: "tap"
    })
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
});
