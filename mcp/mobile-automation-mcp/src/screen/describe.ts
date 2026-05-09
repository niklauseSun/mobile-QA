export interface ScreenElementDescription {
  role: string;
  text?: string;
  accessibilityId?: string;
  resourceId?: string;
  className?: string;
  visible?: boolean;
  enabled?: boolean;
  bounds?: string;
}

export interface DescribeScreenOptions {
  includeInvisible?: boolean;
  maxElements?: number;
}

const DEFAULT_MAX_ELEMENTS = 100;

export function describePageSource(
  source: string,
  options: DescribeScreenOptions = {}
): { elements: ScreenElementDescription[] } {
  const includeInvisible = options.includeInvisible ?? false;
  const maxElements = options.maxElements ?? DEFAULT_MAX_ELEMENTS;
  const elements: ScreenElementDescription[] = [];

  for (const attributes of readElementAttributes(source)) {
    const element = toScreenElement(attributes);

    if (!element) {
      continue;
    }

    if (!includeInvisible && element.visible === false) {
      continue;
    }

    elements.push(element);

    if (elements.length >= maxElements) {
      break;
    }
  }

  return { elements };
}

function toScreenElement(
  attributes: Record<string, string>
): ScreenElementDescription | null {
  const className = first(attributes["class"], attributes.type);
  const role = normalizeRole(className);
  const text = first(attributes.text, attributes.label, attributes.value);
  const accessibilityId = first(attributes["content-desc"], attributes.name);
  const resourceId = first(attributes["resource-id"]);

  if (!text && !accessibilityId && !resourceId) {
    return null;
  }

  return stripUndefined({
    role,
    text,
    accessibilityId,
    resourceId,
    className,
    visible: parseBoolean(first(attributes.displayed, attributes.visible)),
    enabled: parseBoolean(attributes.enabled),
    bounds: first(attributes.bounds)
  });
}

function* readElementAttributes(
  source: string
): Generator<Record<string, string>> {
  const tagPattern = /<([A-Za-z0-9_.:-]+)(\s[^<>]*?)\/?>/g;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagPattern.exec(source))) {
    const tagName = tagMatch[1];

    if (tagName.startsWith("?") || tagName.startsWith("!")) {
      continue;
    }

    yield parseAttributes(tagMatch[2] ?? "");
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

  return className
    .replace(/^XCUIElementType/, "")
    .replace(/^android\.(widget|view)\./, "")
    .trim() || "element";
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
