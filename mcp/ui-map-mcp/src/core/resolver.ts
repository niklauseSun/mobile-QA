import { searchElements, type SearchElementResult } from "./search.js";
import type { UIMapRegistry } from "./registry.js";
import type { Platform, PlatformSelector, UIAction } from "./types.js";

export interface ResolveActionToSelectorInput {
  screen?: string;
  action: string;
  platform: Platform;
}

export interface ResolveActionSuccess {
  status: "resolved";
  action: UIAction;
  semanticId: string;
  screen: string;
  selector: PlatformSelector;
  confidence: number;
}

export interface ResolveActionUnresolved {
  status: "unresolved";
  reason: string;
  suggestions: ResolveActionSuggestion[];
}

export interface ResolveActionSuggestion {
  semanticId: string;
  description: string;
  screen: string;
}

export type ResolveActionResult =
  | ResolveActionSuccess
  | ResolveActionUnresolved;

interface NormalizedAction {
  action: UIAction;
  targetText: string;
}

interface ActionPattern {
  action: UIAction;
  triggers: string[];
  cleanup: string[];
}

const MAX_CONFIDENT_SCORE = 0.35;

const ACTION_PATTERNS: ActionPattern[] = [
  {
    action: "longPress",
    triggers: ["长按", "long press", "longpress"],
    cleanup: ["长按", "long press", "longpress"]
  },
  {
    action: "assertVisible",
    triggers: ["可见", "visible", "assert visible", "检查"],
    cleanup: ["检查", "校验", "断言", "可见", "visible", "assert visible"]
  },
  {
    action: "assertText",
    triggers: ["文本", "文案", "assert text"],
    cleanup: ["检查", "校验", "断言", "文本", "文案", "assert text"]
  },
  {
    action: "clear",
    triggers: ["清空", "清除", "clear"],
    cleanup: ["清空", "清除", "clear"]
  },
  {
    action: "input",
    triggers: ["输入", "填写", "录入", "type", "input", "enter"],
    cleanup: ["输入", "填写", "录入", "type", "enter"]
  },
  {
    action: "focus",
    triggers: ["聚焦", "focus"],
    cleanup: ["聚焦", "focus"]
  },
  {
    action: "swipe",
    triggers: ["滑动", "swipe"],
    cleanup: ["滑动", "swipe"]
  },
  {
    action: "tap",
    triggers: ["点击", "点按", "轻点", "tap", "click"],
    cleanup: ["点击", "点按", "轻点", "tap", "click"]
  }
];

export function resolveActionToSelector(
  registry: UIMapRegistry,
  input: ResolveActionToSelectorInput
): ResolveActionResult {
  const normalizedAction = normalizeAction(input.action);

  if (normalizedAction === undefined) {
    return {
      status: "unresolved",
      reason: "action_not_recognized",
      suggestions: []
    };
  }

  const matches = searchElements(registry, {
    query: normalizedAction.targetText,
    screen: input.screen,
    platform: input.platform,
    limit: 5
  });
  const bestMatch = matches[0];

  if (bestMatch === undefined || bestMatch.score > MAX_CONFIDENT_SCORE) {
    return {
      status: "unresolved",
      reason: "no_confident_match",
      suggestions: toSuggestions(matches)
    };
  }

  if (!bestMatch.actions.includes(normalizedAction.action)) {
    return {
      status: "unresolved",
      reason: "action_not_supported",
      suggestions: toSuggestions(matches)
    };
  }

  if (bestMatch.selector === undefined) {
    return {
      status: "unresolved",
      reason: "selector_not_available",
      suggestions: toSuggestions(matches)
    };
  }

  return {
    status: "resolved",
    action: normalizedAction.action,
    semanticId: bestMatch.semanticId,
    screen: bestMatch.screen,
    selector: bestMatch.selector,
    confidence: toConfidence(bestMatch.score)
  };
}

function normalizeAction(actionText: string): NormalizedAction | undefined {
  const normalizedText = actionText.trim();
  const lowerText = normalizedText.toLowerCase();
  const pattern = ACTION_PATTERNS.find((candidate) =>
    candidate.triggers.some((trigger) => lowerText.includes(trigger.toLowerCase()))
  );

  if (pattern === undefined) {
    return undefined;
  }

  const targetText = cleanTargetText(normalizedText, pattern.cleanup);

  return {
    action: pattern.action,
    targetText: targetText.length > 0 ? targetText : normalizedText
  };
}

function cleanTargetText(actionText: string, cleanupTokens: string[]): string {
  let targetText = actionText;

  for (const token of cleanupTokens) {
    targetText = targetText.replace(new RegExp(escapeRegExp(token), "gi"), " ");
  }

  return targetText.replace(/\s+/g, " ").trim();
}

function toSuggestions(matches: SearchElementResult[]): ResolveActionSuggestion[] {
  return matches.map((match) => ({
    semanticId: match.semanticId,
    description: match.description,
    screen: match.screen
  }));
}

function toConfidence(score: number): number {
  return Number(Math.max(0, Math.min(1, 1 - score)).toFixed(4));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
