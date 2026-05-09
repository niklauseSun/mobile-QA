import type { MobileAdapter } from "./MobileAdapter.js";
import type { MobileSelector } from "../selectors/types.js";

export class HybridAdapter implements MobileAdapter {
  runtime = "hybrid" as const;

  toDriverSelector(selector: MobileSelector): string {
    switch (selector.strategy) {
      case "accessibilityId":
      case "testId":
        return `~${selector.value}`;

      case "resourceId":
        return `id=${selector.value}`;

      case "text":
        return this.textSelector(selector.value);

      case "xpath":
        return selector.value;

      case "css":
        throw new Error(
          "CSS selectors are only supported by WebView tools such as mobile_webview_tap and mobile_webview_type."
        );

      default:
        throw new Error(
          `Hybrid runtime does not support selector strategy: ${selector.strategy}`
        );
    }
  }

  textSelector(text: string): string {
    return `//*[contains(@text, "${text}") or contains(@label, "${text}") or contains(@name, "${text}") or contains(@value, "${text}")]`;
  }
}
