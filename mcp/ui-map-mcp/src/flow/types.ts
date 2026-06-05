import type {
  Platform,
  UIAction
} from "../core/types.js";
import type { ValidateSelectorSuggestion } from "../core/validator.js";

export interface SemanticFlowStep {
  action: UIAction;
  target: string;
  value?: string;
}

export interface SemanticFlow {
  name: string;
  platform: Platform;
  steps: SemanticFlowStep[];
}

export interface ValidatedSemanticFlowStep extends SemanticFlowStep {
  index: number;
}

export interface UnresolvedSemanticFlowStep {
  index: number;
  action?: UIAction;
  target?: string;
  value?: string;
  reason: string;
  suggestions: ValidateSelectorSuggestion[];
}

export interface SemanticFlowValidationResult {
  valid: boolean;
  name?: string;
  platform?: Platform;
  steps: ValidatedSemanticFlowStep[];
  unresolvedSteps: UnresolvedSemanticFlowStep[];
}
