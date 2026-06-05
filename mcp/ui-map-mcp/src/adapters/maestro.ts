import type { UIMapRegistry } from "../core/registry.js";
import type {
  PlatformSelector,
  SelectorType,
  UIAction
} from "../core/types.js";
import { validateSelectorExists } from "../core/validator.js";
import { SemanticFlowSchema } from "../flow/schema.js";
import type {
  SemanticFlow,
  UnresolvedSemanticFlowStep
} from "../flow/types.js";

export interface MaestroConvertedResult {
  status: "converted";
  yaml: string;
}

export interface MaestroUnresolvedResult {
  status: "unresolved";
  reason: string;
  unresolvedSteps: UnresolvedSemanticFlowStep[];
}

export interface MaestroUnsupportedResult {
  status: "unsupported";
  reason: string;
  unsupportedSteps: MaestroUnsupportedStep[];
}

export interface MaestroUnsupportedStep {
  index: number;
  action: UIAction;
  target: string;
  reason: string;
}

export type MaestroAdapterResult =
  | MaestroConvertedResult
  | MaestroUnresolvedResult
  | MaestroUnsupportedResult;

interface MaestroLocator {
  key: "id" | "text";
  value: string;
}

type SupportedMaestroAction = Extract<UIAction, "input" | "tap" | "assertVisible">;

export function semanticFlowToMaestro(
  registry: UIMapRegistry,
  flow: unknown
): MaestroAdapterResult {
  const parsedFlow = SemanticFlowSchema.safeParse(flow);

  if (!parsedFlow.success) {
    return {
      status: "unresolved",
      reason: "invalid_flow_schema",
      unresolvedSteps: [
        {
          index: -1,
          reason: "invalid_flow_schema",
          suggestions: []
        }
      ]
    };
  }

  return convertParsedFlow(registry, parsedFlow.data);
}

function convertParsedFlow(
  registry: UIMapRegistry,
  flow: SemanticFlow
): MaestroAdapterResult {
  const yamlLines: string[] = [];
  const unresolvedSteps: UnresolvedSemanticFlowStep[] = [];
  const unsupportedSteps: MaestroUnsupportedStep[] = [];

  flow.steps.forEach((step, index) => {
    const action = step.action;

    if (!isSupportedMaestroAction(action)) {
      unsupportedSteps.push({
        index,
        action,
        target: step.target,
        reason: `unsupported_action:${action}`
      });
      return;
    }

    const validation = validateSelectorExists(registry, {
      semanticId: step.target,
      platform: flow.platform,
      action
    });

    if (!validation.exists) {
      unresolvedSteps.push({
        index,
        action,
        target: step.target,
        value: step.value,
        reason: validation.reason,
        suggestions: validation.suggestions
      });
      return;
    }

    const locator = toMaestroLocator(validation.selector);

    if (locator.status === "unsupported") {
      unsupportedSteps.push({
        index,
        action,
        target: step.target,
        reason: locator.reason
      });
      return;
    }

    yamlLines.push(...toMaestroCommandLines(action, locator.locator, step.value));
  });

  if (unresolvedSteps.length > 0) {
    return {
      status: "unresolved",
      reason: "flow_has_unresolved_steps",
      unresolvedSteps
    };
  }

  if (unsupportedSteps.length > 0) {
    return {
      status: "unsupported",
      reason: unsupportedSteps[0].reason,
      unsupportedSteps
    };
  }

  return {
    status: "converted",
    yaml: yamlLines.join("\n")
  };
}

function isSupportedMaestroAction(action: UIAction): action is SupportedMaestroAction {
  return action === "input" || action === "tap" || action === "assertVisible";
}

function toMaestroLocator(
  selector: PlatformSelector
):
  | { status: "ok"; locator: MaestroLocator }
  | { status: "unsupported"; reason: string } {
  if (isIdSelector(selector.selectorType)) {
    return {
      status: "ok",
      locator: {
        key: "id",
        value: selector.selector
      }
    };
  }

  if (selector.selectorType === "text") {
    return {
      status: "ok",
      locator: {
        key: "text",
        value: selector.selector
      }
    };
  }

  return {
    status: "unsupported",
    reason: `unsupported_selector_type:${selector.selectorType}`
  };
}

function isIdSelector(selectorType: SelectorType): boolean {
  return (
    selectorType === "accessibilityId" ||
    selectorType === "resourceId" ||
    selectorType === "data-testid"
  );
}

function toMaestroCommandLines(
  action: SupportedMaestroAction,
  locator: MaestroLocator,
  value?: string
): string[] {
  if (action === "input") {
    return [
      "- tapOn:",
      `    ${locator.key}: ${quoteYamlString(locator.value)}`,
      `- inputText: ${quoteYamlString(value ?? "")}`
    ];
  }

  if (action === "tap") {
    return [
      "- tapOn:",
      `    ${locator.key}: ${quoteYamlString(locator.value)}`
    ];
  }

  return [
    "- assertVisible:",
    `    ${locator.key}: ${quoteYamlString(locator.value)}`
  ];
}

function quoteYamlString(value: string): string {
  return JSON.stringify(value);
}
