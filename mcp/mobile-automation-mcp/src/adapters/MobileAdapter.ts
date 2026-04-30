import type { MobileRuntime, MobileSelector } from "../selectors/types.js";

export interface MobileAdapter {
  runtime: MobileRuntime;

  toDriverSelector(selector: MobileSelector): string;

  textSelector(text: string): string;
}