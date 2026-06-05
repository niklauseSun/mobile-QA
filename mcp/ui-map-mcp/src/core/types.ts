export type Platform = "ios" | "android" | "web";

export type UIElementType =
  | "input"
  | "button"
  | "text"
  | "cell"
  | "image"
  | "tab"
  | "switch"
  | "checkbox";

export type UIAction =
  | "tap"
  | "input"
  | "clear"
  | "focus"
  | "swipe"
  | "assertVisible"
  | "assertText"
  | "longPress";

export type SelectorType =
  | "accessibilityId"
  | "resourceId"
  | "xpath"
  | "text"
  | "data-testid"
  | "css";

export interface PlatformSelector {
  selectorType: SelectorType;
  selector: string;
}

export interface UIElement {
  semanticId: string;
  description: string;
  type: UIElementType;
  aliases?: string[];
  actions: UIAction[];
  required?: boolean;
  platform: Partial<Record<Platform, PlatformSelector>>;
}

export interface UIScreen {
  name: string;
  description?: string;
  route?: string;
  elements: Record<string, UIElement>;
}

export interface UIMap {
  screens: Record<string, UIScreen>;
}
