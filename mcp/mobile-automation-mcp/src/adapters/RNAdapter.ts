import type { MobileAdapter } from "./MobileAdapter.js";
import type { MobileSelector } from "../selectors/types.js";

export class RNAdapter implements MobileAdapter {
  runtime = "rn" as const;

  toDriverSelector(selector: MobileSelector): string {
    switch (selector.strategy) {
      case "accessibilityId":
      case "testId":
        return `~${selector.value}`;

      case "text":
        return this.textSelector(selector.value);

      case "xpath":
        return selector.value;

      default:
        throw new Error(
          `RN runtime does not support selector strategy: ${selector.strategy}`
        );
    }
  }

  textSelector(text: string): string {
    return `//*[contains(@text, "${text}") or contains(@label, "${text}") or contains(@name, "${text}") or contains(@value, "${text}")]`;
  }
}