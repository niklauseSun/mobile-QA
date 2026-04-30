export type MobilePlatform = "ios" | "android";

export type MobileRuntime =
  | "rn"
  | "android-native"
  | "ios-native";

export type SelectorStrategy =
  | "accessibilityId"
  | "testId"
  | "resourceId"
  | "iosPredicate"
  | "iosClassChain"
  | "text"
  | "xpath";

export interface MobileSelector {
  strategy: SelectorStrategy;
  value: string;
}