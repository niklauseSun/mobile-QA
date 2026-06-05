import type { UIMapRegistry } from "../core/registry.js";
import { validateSelectorExists } from "../core/validator.js";
import { SemanticFlowSchema } from "./schema.js";
import type {
  SemanticFlow,
  SemanticFlowValidationResult,
  UnresolvedSemanticFlowStep,
  ValidatedSemanticFlowStep
} from "./types.js";

export function validateSemanticFlow(
  registry: UIMapRegistry,
  flow: unknown
): SemanticFlowValidationResult {
  const parsedFlow = SemanticFlowSchema.safeParse(flow);

  if (!parsedFlow.success) {
    return {
      valid: false,
      steps: [],
      unresolvedSteps: [
        {
          index: -1,
          reason: "invalid_flow_schema",
          suggestions: []
        }
      ]
    };
  }

  return validateParsedSemanticFlow(registry, parsedFlow.data);
}

function validateParsedSemanticFlow(
  registry: UIMapRegistry,
  flow: SemanticFlow
): SemanticFlowValidationResult {
  const steps: ValidatedSemanticFlowStep[] = [];
  const unresolvedSteps: UnresolvedSemanticFlowStep[] = [];

  flow.steps.forEach((step, index) => {
    const validation = validateSelectorExists(registry, {
      semanticId: step.target,
      platform: flow.platform,
      action: step.action
    });

    if (validation.exists) {
      steps.push({
        index,
        action: step.action,
        target: step.target,
        value: step.value
      });
      return;
    }

    unresolvedSteps.push({
      index,
      action: step.action,
      target: step.target,
      value: step.value,
      reason: validation.reason,
      suggestions: validation.suggestions
    });
  });

  return {
    valid: unresolvedSteps.length === 0,
    name: flow.name,
    platform: flow.platform,
    steps,
    unresolvedSteps
  };
}
