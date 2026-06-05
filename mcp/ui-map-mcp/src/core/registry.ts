import type { UIElement, UIMap, UIScreen } from "./types.js";

export interface UIElementLocation {
  screen: string;
  key: string;
  element: UIElement;
}

export class UIMapRegistry {
  private readonly screens = new Map<string, UIScreen>();
  private readonly elementsBySemanticId = new Map<string, UIElement>();

  constructor(uiMaps: UIMap[] = []) {
    for (const uiMap of uiMaps) {
      this.addMap(uiMap);
    }
  }

  listScreens(): string[] {
    return [...this.screens.keys()].sort((left, right) =>
      left.localeCompare(right)
    );
  }

  getScreen(screenName: string): UIScreen | undefined {
    return this.screens.get(screenName);
  }

  getScreenElements(screenName: string): UIElement[] {
    const screen = this.getScreen(screenName);

    if (screen === undefined) {
      return [];
    }

    return Object.values(screen.elements);
  }

  getElementBySemanticId(semanticId: string): UIElement | undefined {
    return this.elementsBySemanticId.get(semanticId);
  }

  getElementLocationBySemanticId(
    semanticId: string
  ): UIElementLocation | undefined {
    for (const [screenName, screen] of this.screens.entries()) {
      for (const [key, element] of Object.entries(screen.elements)) {
        if (element.semanticId === semanticId) {
          return {
            screen: screenName,
            key,
            element
          };
        }
      }
    }

    return undefined;
  }

  hasElement(semanticId: string): boolean {
    return this.elementsBySemanticId.has(semanticId);
  }

  private addMap(uiMap: UIMap): void {
    for (const [screenName, screen] of Object.entries(uiMap.screens)) {
      this.addScreen(screenName, screen);
    }
  }

  private addScreen(screenName: string, screen: UIScreen): void {
    if (this.screens.has(screenName)) {
      throw new Error(`Duplicate screen name: ${screenName}`);
    }

    const duplicateScreen = [...this.screens.entries()].find(
      ([existingScreenName, existingScreen]) =>
        existingScreenName !== screenName && existingScreen.name === screen.name
    );

    if (duplicateScreen !== undefined) {
      throw new Error(`Duplicate screen name: ${screen.name}`);
    }

    const semanticIdsInScreen = new Set<string>();

    for (const element of Object.values(screen.elements)) {
      if (
        semanticIdsInScreen.has(element.semanticId) ||
        this.elementsBySemanticId.has(element.semanticId)
      ) {
        throw new Error(`Duplicate semanticId: ${element.semanticId}`);
      }

      semanticIdsInScreen.add(element.semanticId);
    }

    this.screens.set(screenName, screen);

    for (const element of Object.values(screen.elements)) {
      this.elementsBySemanticId.set(element.semanticId, element);
    }
  }
}
