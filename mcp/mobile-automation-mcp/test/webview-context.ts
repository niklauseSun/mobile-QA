import assert from "node:assert/strict";
import {
  getContexts,
  isWebViewContext,
  requireWebViewContext,
  switchContext
} from "../src/webview/context.js";

const driver = {
  currentContext: "NATIVE_APP",
  contexts: ["NATIVE_APP", "WEBVIEW_com.example"],
  async getContext() {
    return this.currentContext;
  },
  async getContexts() {
    return this.contexts;
  },
  async switchContext(context: string) {
    this.currentContext = context;
  }
};

assert.deepEqual(await getContexts(driver as never), [
  "NATIVE_APP",
  "WEBVIEW_com.example"
]);
assert.equal(isWebViewContext("WEBVIEW_com.example"), true);
assert.equal(isWebViewContext("NATIVE_APP"), false);

await assert.rejects(
  () => requireWebViewContext(driver as never),
  /Switch to a WEBVIEW context with mobile_switch_context/
);

await switchContext(driver as never, "WEBVIEW_com.example");
assert.equal(await requireWebViewContext(driver as never), "WEBVIEW_com.example");

console.log("webview context test passed.");
