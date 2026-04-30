import type { MobilePlatform, MobileRuntime, MobileSelector } from "../selectors/types.js";

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
    };

export interface MobileFlow {
  name: string;
  platform?: MobilePlatform;
  runtime?: MobileRuntime;
  steps: FlowStep[];
}