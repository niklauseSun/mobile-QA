import type { MobileAdapter } from "./MobileAdapter.js";
import type { MobileSelector } from "../selectors/types.js";

export class AndroidNativeAdapter implements MobileAdapter {
  runtime = "android-native" as const;

  toDriverSelector(selector: MobileSelector): string {
    switch (selector.strategy) {
      case "accessibilityId":
        return `~${selector.value}`;

      case "resourceId":
        return `id=${selector.value}`;

      case "text":
        return this.textSelector(selector.value);

      case "xpath":
        return selector.value;

      default:
        throw new Error(
          `Android Native runtime does not support selector strategy: ${selector.strategy}`
        );
    }
  }

  textSelector(text: string): string {
    return `//*[@text="${text}" or contains(@text, "${text}")]`;
  }
}