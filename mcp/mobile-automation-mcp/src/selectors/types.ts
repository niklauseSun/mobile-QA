export type MobilePlatform = "ios" | "android";

export type MobileRuntime =
  | "rn"
  | "android-native"
  | "ios-native"
  | "hybrid";

export type SelectorStrategy =
  | "accessibilityId"
  | "testId"
  | "resourceId"
  | "iosPredicate"
  | "iosClassChain"
  | "text"
  | "xpath"
  | "css";

export interface MobileSelector {
  strategy: SelectorStrategy;
  value: string;
}
