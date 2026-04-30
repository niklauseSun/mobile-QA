import type { MobileAdapter } from "./MobileAdapter.js";
import type { MobileSelector } from "../selectors/types.js";

export class IOSNativeAdapter implements MobileAdapter {
  runtime = "ios-native" as const;

  toDriverSelector(selector: MobileSelector): string {
    switch (selector.strategy) {
      case "accessibilityId":
      case "testId":
        return `~${selector.value}`;

      case "iosPredicate":
        return `-ios predicate string:${selector.value}`;

      case "iosClassChain":
        return `-ios class chain:${selector.value}`;

      case "text":
        return this.textSelector(selector.value);

      case "xpath":
        return selector.value;

      default:
        throw new Error(
          `iOS Native runtime does not support selector strategy: ${selector.strategy}`
        );
    }
  }

  textSelector(text: string): string {
    return `//*[contains(@label, "${text}") or contains(@name, "${text}") or contains(@value, "${text}")]`;
  }
}