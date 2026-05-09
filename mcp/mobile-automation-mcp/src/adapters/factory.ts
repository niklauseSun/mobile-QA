import type { MobileRuntime } from "../selectors/types.js";
import type { MobileAdapter } from "./MobileAdapter.js";
import { RNAdapter } from "./RNAdapter.js";
import { AndroidNativeAdapter } from "./AndroidNativeAdapter.js";
import { IOSNativeAdapter } from "./IOSNativeAdapter.js";
import { HybridAdapter } from "./HybridAdapter.js";

export function createAdapter(runtime: MobileRuntime): MobileAdapter {
  switch (runtime) {
    case "rn":
      return new RNAdapter();

    case "android-native":
      return new AndroidNativeAdapter();

    case "ios-native":
      return new IOSNativeAdapter();

    case "hybrid":
      return new HybridAdapter();

    default:
      throw new Error(`Unsupported runtime: ${runtime}`);
  }
}
