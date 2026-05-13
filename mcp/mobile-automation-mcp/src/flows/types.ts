import type { MobilePlatform, MobileRuntime, MobileSelector } from "../selectors/types.js";
import type {
  MobilePoint,
  SwipeDirection
} from "../appium/gestures.js";

export type FlowStep =
  | {
      action: "tap";
      selector: MobileSelector;
      timeoutMs?: number;
    }
  | {
      action: "type";
      selector: MobileSelector;
      text: string;
      clearFirst?: boolean;
      timeoutMs?: number;
    }
  | {
      action: "assertText";
      text: string;
      timeoutMs?: number;
    }
  | {
      action: "wait";
      ms: number;
    }
  | {
      action: "screenshot";
      name?: string;
    }
  | {
      action: "back";
    }
  | {
      action: "swipe";
      direction?: SwipeDirection;
      durationMs?: number;
      percent?: number;
      from?: MobilePoint;
      to?: MobilePoint;
    }
  | {
      action: "scroll";
      selector?: MobileSelector;
      scrollableSelector?: MobileSelector;
      direction?: SwipeDirection;
      durationMs?: number;
      percent?: number;
      from?: MobilePoint;
      to?: MobilePoint;
      maxScrolls?: number;
      timeoutMs?: number;
    }
  | {
      action: "longPress";
      selector?: MobileSelector;
      x?: number;
      y?: number;
      durationMs?: number;
      timeoutMs?: number;
    }
  | {
      action: "hideKeyboard";
      keys?: string[];
    }
  | {
      action: "deepLink";
      url: string;
      appIdentifier: string;
      waitForLaunch?: boolean;
    };

export interface MobileFlow {
  name: string;
  platform?: MobilePlatform;
  runtime?: MobileRuntime;
  steps: FlowStep[];
}
