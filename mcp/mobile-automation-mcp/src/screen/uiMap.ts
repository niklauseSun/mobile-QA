import type {
  MobilePlatform,
  MobileRuntime,
  MobileSelector
} from "../selectors/types.js";

export interface SelectorCandidate extends MobileSelector {
  score: number;
  reason: string;
}

export interface UiMapElement {
  elementId: string;
  parentId?: string;
  depth: number;
  index: number;
  path: string;
  role: string;
  text?: string;
  accessibilityId?: string;
  resourceId?: string;
  className?: string;
  visible?: boolean;
  enabled?: boolean;
  bounds?: string;
  selectors: SelectorCandidate[];
}

export interface UiMapSummary {
  totalElements: number;
  visibleElements: number;
  interactableElements: number;
  returnedElements: number;
}

export interface UiMap {
  summary: UiMapSummary;
  elements: UiMapElement[];
}

export interface BuildUiMapOptions {
  platform?: MobilePlatform;
  runtime?: MobileRuntime;
  includeInvisible?: boolean;
  maxElements?: number;
}

export interface FindSelectorsOptions extends BuildUiMapOptions {
  query: string;
  exact?: boolean;
  maxResults?: number;
}

export interface SelectorMatch {
  element: UiMapElement;
  selectors: SelectorCandidate[];
  matchReasons: string[];
}

export interface FindSelectorsResult {
  query: string;
  matches: SelectorMatch[];
}

interface SourceNode {
  rawId: string;
  parentRawId?: string;
  depth: number;
  index: number;
  tagName: string;
  path: string;
  attributes: Record<string, string>;
}

interface StackEntry {
  tagName: string;
  rawId: string;
  path: string;
}

const DEFAULT_MAX_ELEMENTS = 100;
const DEFAULT_MAX_RESULTS = 20;

export function buildUiMap(
  source: string,
  options: BuildUiMapOptions = {}
): UiMap {
  const includeInvisible = options.includeInvisible ?? false;
  const maxElements = options.maxElements ?? DEFAULT_MAX_ELEMENTS;
  const nodes = parseSourceNodes(source);
  const meaningfulElements = nodes
    .map((node) => toUiMapElement(node, options))
    .filter((element): element is UiMapElement => element !== null);
  const visibleElements = meaningfulElements.filter(
    (element) => element.visible !== false
  );
  const filteredElements = (includeInvisible
    ? meaningfulElements
    : visibleElements
  ).slice(0, maxElements);
  const returnedRawIds = new Set(filteredElements.map((element) => element.elementId));
  const rawToElementId = new Map(
    filteredElements.map((element, index) => [element.elementId, `e${index + 1}`])
  );

  const elements = filteredElements.map((element, index) => {
    const elementId = `e${index + 1}`;
    const parentId =
      element.parentId && returnedRawIds.has(element.parentId)
        ? rawToElementId.get(element.parentId)
        : undefined;

    return stripUndefined({
      ...element,
      elementId,
      parentId
    });
  });

  return {
    summary: {
      totalElements: meaningfulElements.length,
      visibleElements: visibleElements.length,
      interactableElements: meaningfulElements.filter(isInteractable).length,
      returnedElements: elements.length
    },
    elements
  };
}

export function findSelectors(
  source: string,
  options: FindSelectorsOptions
): FindSelectorsResult {
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const query = options.query.trim();

  if (!query) {
    return {
      query: options.query,
      matches: []
    };
  }

  const uiMap = buildUiMap(source, {
    ...options,
    maxElements: options.maxElements ?? 500
  });
  const matches: SelectorMatch[] = [];

  for (const element of uiMap.elements) {
    const matchReasons = getMatchReasons(element, query, options.exact ?? false);

    if (matchReasons.length === 0) {
      continue;
    }

    matches.push({
      element,
      selectors: element.selectors,
      matchReasons
    });

    if (matches.length >= maxResults) {
      break;
    }
  }

  return {
    query: options.query,
    matches
  };
}

function toUiMapElement(
  node: SourceNode,
  options: BuildUiMapOptions
): UiMapElement | null {
  const attributes = node.attributes;
  const className = first(attributes["class"], attributes.type, node.tagName);
  const role = normalizeRole(className);
  const text = first(attributes.text, attributes.label, attributes.value);
  const accessibilityId = first(attributes["content-desc"], attributes.name);
  const resourceId = first(attributes["resource-id"]);
  const visible = parseBoolean(first(attributes.displayed, attributes.visible));
  const enabled = parseBoolean(attributes.enabled);
  const bounds = first(attributes.bounds);
  const selectors = createSelectorCandidates(attributes, {
    ...options,
    role,
    text,
    accessibilityId,
    resourceId
  });

  if (
    selectors.length === 0 &&
    !text &&
    !accessibilityId &&
    !resourceId &&
    !isKnownInteractiveRole(role)
  ) {
    return null;
  }

  return stripUndefined({
    elementId: node.rawId,
    parentId: node.parentRawId,
    depth: node.depth,
    index: node.index,
    path: node.path,
    role,
    text,
    accessibilityId,
    resourceId,
    className,
    visible,
    enabled,
    bounds,
    selectors
  });
}

function createSelectorCandidates(
  attributes: Record<string, string>,
  context: BuildUiMapOptions & {
    role: string;
    text?: string;
    accessibilityId?: string;
    resourceId?: string;
  }
): SelectorCandidate[] {
  const candidates: SelectorCandidate[] = [];
  const platform = context.platform;
  const runtime = context.runtime;

  if (context.accessibilityId) {
    addCandidate(candidates, {
      strategy: "accessibilityId",
      value: context.accessibilityId,
      score: 100,
      reason: "accessibility id"
    });

    if (runtime === "rn") {
      addCandidate(candidates, {
        strategy: "testId",
        value: context.accessibilityId,
        score: 98,
        reason: "react native test id"
      });
    }
  }

  if (platform !== "ios" && context.resourceId) {
    addCandidate(candidates, {
      strategy: "resourceId",
      value: context.resourceId,
      score: 95,
      reason: "android resource id"
    });
  }

  if (platform === "ios") {
    addIosPredicateCandidates(candidates, attributes);
  }

  if (context.text) {
    addCandidate(candidates, {
      strategy: "text",
      value: context.text,
      score: 70,
      reason: "visible text"
    });
  }

  addXpathFallbacks(candidates, attributes, platform);

  return candidates.sort((a, b) => b.score - a.score);
}

function addIosPredicateCandidates(
  candidates: SelectorCandidate[],
  attributes: Record<string, string>
) {
  for (const attributeName of ["name", "label", "value"]) {
    const value = attributes[attributeName];

    if (!value) {
      continue;
    }

    addCandidate(candidates, {
      strategy: "iosPredicate",
      value: `${attributeName} == ${quotedString(value)}`,
      score: attributeName === "name" ? 90 : 85,
      reason: `ios ${attributeName} predicate`
    });
  }
}

function addXpathFallbacks(
  candidates: SelectorCandidate[],
  attributes: Record<string, string>,
  platform?: MobilePlatform
) {
  const xpathAttributes =
    platform === "ios"
      ? ["name", "label", "value"]
      : ["content-desc", "resource-id", "text"];

  for (const attributeName of xpathAttributes) {
    const value = attributes[attributeName];

    if (!value) {
      continue;
    }

    addCandidate(candidates, {
      strategy: "xpath",
      value: `//*[@${attributeName}=${xpathLiteral(value)}]`,
      score: 40,
      reason: `${attributeName} xpath fallback`
    });
  }
}

function addCandidate(
  candidates: SelectorCandidate[],
  candidate: SelectorCandidate
) {
  if (
    candidates.some(
      (existing) =>
        existing.strategy === candidate.strategy && existing.value === candidate.value
    )
  ) {
    return;
  }

  candidates.push(candidate);
}

function getMatchReasons(
  element: UiMapElement,
  query: string,
  exact: boolean
): string[] {
  const fields: Array<[string, string | undefined]> = [
    ["text", element.text],
    ["accessibilityId", element.accessibilityId],
    ["resourceId", element.resourceId],
    ["role", element.role],
    ["className", element.className],
    ["bounds", element.bounds]
  ];
  const reasons: string[] = [];

  for (const [name, value] of fields) {
    if (!value) {
      continue;
    }

    if (matchesQuery(value, query, exact)) {
      reasons.push(name);
    }
  }

  return reasons;
}

function matchesQuery(value: string, query: string, exact: boolean) {
  const normalizedValue = value.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  return exact
    ? normalizedValue === normalizedQuery
    : normalizedValue.includes(normalizedQuery);
}

function parseSourceNodes(source: string): SourceNode[] {
  const tagPattern = /<\s*(\/?)([A-Za-z0-9_.:-]+)([^<>]*?)(\/?)\s*>/g;
  const stack: StackEntry[] = [];
  const siblingCounts = new Map<string, number>();
  const nodes: SourceNode[] = [];
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagPattern.exec(source))) {
    const isClosing = tagMatch[1] === "/";
    const tagName = tagMatch[2];
    const attributeSource = tagMatch[3] ?? "";
    const isSelfClosing = tagMatch[4] === "/" || attributeSource.trim().endsWith("/");

    if (tagName.startsWith("?") || tagName.startsWith("!")) {
      continue;
    }

    if (isClosing) {
      popStackToTag(stack, tagName);
      continue;
    }

    const parent = stack.at(-1);
    const depth = stack.length;
    const siblingKey = `${parent?.rawId ?? "root"}:${tagName}`;
    const siblingIndex = (siblingCounts.get(siblingKey) ?? 0) + 1;
    siblingCounts.set(siblingKey, siblingIndex);

    const rawId = `raw-${nodes.length + 1}`;
    const path = `${parent?.path ?? ""}/${tagName}[${siblingIndex}]`;

    nodes.push({
      rawId,
      parentRawId: parent?.rawId,
      depth,
      index: nodes.length,
      tagName,
      path,
      attributes: parseAttributes(attributeSource)
    });

    if (!isSelfClosing) {
      stack.push({
        tagName,
        rawId,
        path
      });
    }
  }

  return nodes;
}

function popStackToTag(stack: StackEntry[], tagName: string) {
  while (stack.length > 0) {
    const current = stack.pop();

    if (current?.tagName === tagName) {
      return;
    }
  }
}

function parseAttributes(attributeSource: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([A-Za-z0-9_:-]+)="([^"]*)"/g;
  let attributeMatch: RegExpExecArray | null;

  while ((attributeMatch = attributePattern.exec(attributeSource))) {
    attributes[attributeMatch[1]] = decodeXmlEntities(attributeMatch[2]);
  }

  return attributes;
}

function normalizeRole(className: string | undefined): string {
  if (!className) {
    return "element";
  }

  return (
    className
      .replace(/^XCUIElementType/, "")
      .replace(/^android\.(widget|view)\./, "")
      .trim() || "element"
  );
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  return value.toLowerCase() === "true";
}

function first(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== "");
}

function isKnownInteractiveRole(role: string) {
  return /button|edit|field|input|switch|checkbox|radio|cell|link/i.test(role);
}

function isInteractable(element: UiMapElement) {
  return element.enabled !== false && isKnownInteractiveRole(element.role);
}

function quotedString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function xpathLiteral(value: string) {
  if (!value.includes("\"")) {
    return `"${value}"`;
  }

  if (!value.includes("'")) {
    return `'${value}'`;
  }

  return `concat(${value
    .split("\"")
    .map((part) => `"${part}"`)
    .join(", '\"', ")})`;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      delete value[key];
    }
  }

  return value;
}
