import type { UIMapRegistry } from "./registry.js";
import type { Platform, PlatformSelector, UIAction, UIElement } from "./types.js";

export interface ValidateSelectorExistsInput {
  semanticId: string;
  platform: Platform;
  action?: string;
}

export interface ValidateSelectorSuccess {
  exists: true;
  semanticId: string;
  selector: PlatformSelector;
  source: "ui-map";
}

export interface ValidateSelectorFailure {
  exists: false;
  reason: string;
  suggestions: ValidateSelectorSuggestion[];
}

export interface ValidateSelectorSuggestion {
  semanticId: string;
  description: string;
  screen: string;
}

export type ValidateSelectorResult =
  | ValidateSelectorSuccess
  | ValidateSelectorFailure;

export function validateSelectorExists(
  registry: UIMapRegistry,
  input: ValidateSelectorExistsInput
): ValidateSelectorResult {
  const element = registry.getElementBySemanticId(input.semanticId);

  if (element === undefined) {
    return {
      exists: false,
      reason: "element_not_found",
      suggestions: getSameScreenSuggestions(registry, input.semanticId)
    };
  }

  const screen = findElementScreen(registry, element);
  const suggestions = getSameScreenSuggestions(
    registry,
    input.semanticId,
    screen
  );

  if (input.action !== undefined && !isSupportedAction(element, input.action)) {
    return {
      exists: false,
      reason: "action_not_supported",
      suggestions
    };
  }

  const selector = element.platform[input.platform];

  if (selector === undefined) {
    return {
      exists: false,
      reason: "selector_not_available",
      suggestions
    };
  }

  return {
    exists: true,
    semanticId: input.semanticId,
    selector,
    source: "ui-map"
  };
}

function isSupportedAction(element: UIElement, action: string): action is UIAction {
  return element.actions.includes(action as UIAction);
}

function getSameScreenSuggestions(
  registry: UIMapRegistry,
  semanticId: string,
  knownScreen?: string
): ValidateSelectorSuggestion[] {
  const screen = knownScreen ?? getScreenNameFromSemanticId(semanticId);

  if (screen === undefined) {
    return [];
  }

  return registry.getScreenElements(screen).map((element) => ({
    semanticId: element.semanticId,
    description: element.description,
    screen
  }));
}

function findElementScreen(
  registry: UIMapRegistry,
  targetElement: UIElement
): string | undefined {
  for (const screen of registry.listScreens()) {
    if (
      registry
        .getScreenElements(screen)
        .some((element) => element.semanticId === targetElement.semanticId)
    ) {
      return screen;
    }
  }

  return getScreenNameFromSemanticId(targetElement.semanticId);
}

function getScreenNameFromSemanticId(semanticId: string): string | undefined {
  const [screenName] = semanticId.split(".");
  return screenName.length > 0 ? screenName : undefined;
}
