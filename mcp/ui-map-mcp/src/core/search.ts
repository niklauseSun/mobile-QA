import Fuse from "fuse.js";

import type { UIMapRegistry } from "./registry.js";
import type { Platform, PlatformSelector, UIAction, UIElementType } from "./types.js";

export interface SearchElementsInput {
  query: string;
  screen?: string;
  platform?: Platform;
  limit?: number;
}

export interface SearchElementResult {
  screen: string;
  key: string;
  semanticId: string;
  description: string;
  type: UIElementType;
  actions: UIAction[];
  selector?: PlatformSelector;
  score: number;
}

interface SearchIndexEntry {
  screen: string;
  key: string;
  semanticId: string;
  description: string;
  aliases: string[];
  type: UIElementType;
  actions: UIAction[];
  selector?: PlatformSelector;
}

const DEFAULT_LIMIT = 5;

export function searchElements(
  registry: UIMapRegistry,
  input: SearchElementsInput
): SearchElementResult[] {
  const query = input.query.trim();

  if (query.length === 0) {
    return [];
  }

  const limit = input.limit ?? DEFAULT_LIMIT;
  const entries = buildSearchIndex(registry, input.screen, input.platform);
  const fuse = new Fuse(entries, {
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.4,
    keys: [
      { name: "semanticId", weight: 0.35 },
      { name: "key", weight: 0.28 },
      { name: "description", weight: 0.18 },
      { name: "aliases", weight: 0.3 },
      { name: "type", weight: 0.12 },
      { name: "actions", weight: 0.12 }
    ]
  });

  return fuse
    .search(query, { limit })
    .map((result) => toSearchResult(result.item, result.score ?? 0));
}

function buildSearchIndex(
  registry: UIMapRegistry,
  screenFilter?: string,
  platform?: Platform
): SearchIndexEntry[] {
  const screenNames =
    screenFilter === undefined ? registry.listScreens() : [screenFilter];
  const entries: SearchIndexEntry[] = [];

  for (const screenName of screenNames) {
    const screen = registry.getScreen(screenName);

    if (screen === undefined) {
      continue;
    }

    for (const [key, element] of Object.entries(screen.elements)) {
      entries.push({
        screen: screenName,
        key,
        semanticId: element.semanticId,
        description: element.description,
        aliases: element.aliases ?? [],
        type: element.type,
        actions: element.actions,
        selector:
          platform === undefined ? undefined : element.platform[platform]
      });
    }
  }

  return entries;
}

function toSearchResult(
  entry: SearchIndexEntry,
  score: number
): SearchElementResult {
  return {
    screen: entry.screen,
    key: entry.key,
    semanticId: entry.semanticId,
    description: entry.description,
    type: entry.type,
    actions: entry.actions,
    selector: entry.selector,
    score
  };
}
