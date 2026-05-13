import path from "node:path";
import { createAdapter } from "../adapters/factory.js";
import type { MobileFlow, FlowStep } from "./types.js";
import type { MobileRuntime } from "../selectors/types.js";

export interface GeneratedAppiumCase {
  code: string;
  summary: string;
}

export function generateAppiumCase(
  testName: string,
  flow: MobileFlow
): GeneratedAppiumCase {
  const runtime = resolveRuntime(flow);
  const adapter = createAdapter(runtime);
  const lines: string[] = [];

  lines.push(`describe(${quote(testName)}, () => {`);
  lines.push(`  it(${quote(flow.name)}, async () => {`);

  for (let index = 0; index < flow.steps.length; index++) {
    const step = flow.steps[index];
    lines.push(...generateStep(index + 1, step, adapter));
  }

  lines.push(`  });`);
  lines.push(`});`);
  lines.push(``);

  return {
    code: lines.join("\n"),
    summary: [
      `Generated WebDriverIO/Appium spec for flow "${flow.name}".`,
      `Runtime: ${runtime}.`,
      `Steps: ${flow.steps.length}.`
    ].join(" ")
  };
}

export function createGeneratedCaseFileName(
  testName: string,
  fileName?: string
): string {
  if (fileName) {
    return fileName.endsWith(".ts") ? fileName : `${fileName}.ts`;
  }

  return `${slugify(testName)}.spec.ts`;
}

export function createGeneratedCasePath(
  outputDir: string,
  testName: string,
  fileName?: string
): string {
  return path.resolve(outputDir, createGeneratedCaseFileName(testName, fileName));
}

function generateStep(
  stepNo: number,
  step: FlowStep,
  adapter: ReturnType<typeof createAdapter>
): string[] {
  const lines = [`    // Step ${stepNo}: ${step.action}`];

  switch (step.action) {
    case "tap": {
      const selector = adapter.toDriverSelector(step.selector);
      lines.push(`    {`);
      lines.push(`      const element = await browser.$(${quote(selector)});`);
      lines.push(
        `      await element.waitForDisplayed({ timeout: ${step.timeoutMs ?? 10000} });`
      );
      lines.push(`      await element.click();`);
      lines.push(`    }`);
      return lines;
    }

    case "type": {
      const selector = adapter.toDriverSelector(step.selector);
      lines.push(`    {`);
      lines.push(`      const element = await browser.$(${quote(selector)});`);
      lines.push(
        `      await element.waitForDisplayed({ timeout: ${step.timeoutMs ?? 10000} });`
      );

      if (step.clearFirst ?? true) {
        lines.push(`      await element.clearValue();`);
      }

      lines.push(`      await element.setValue(${quote(step.text)});`);
      lines.push(`    }`);
      return lines;
    }

    case "assertText": {
      const selector = adapter.textSelector(step.text);
      lines.push(`    {`);
      lines.push(`      const element = await browser.$(${quote(selector)});`);
      lines.push(
        `      await element.waitForDisplayed({ timeout: ${step.timeoutMs ?? 10000} });`
      );
      lines.push(`    }`);
      return lines;
    }

    case "wait":
      lines.push(`    await browser.pause(${step.ms});`);
      return lines;

    case "screenshot":
      lines.push(
        `    await browser.saveScreenshot(${quote(
          `./artifacts/screenshots/${slugify(step.name ?? `step-${stepNo}`)}.png`
        )});`
      );
      return lines;

    case "back":
      lines.push(`    await browser.back();`);
      return lines;

    case "swipe":
      lines.push(`    await browser.swipe(${toJson(createSwipeOptions(step))});`);
      return lines;

    case "scroll": {
      const options = createScrollOptions(step);
      const scrollableSelector = step.scrollableSelector
        ? adapter.toDriverSelector(step.scrollableSelector)
        : undefined;
      const optionLiteral = toObjectLiteral(
        options,
        scrollableSelector ? { scrollableElement: "scrollableElement" } : {}
      );
      const swipeOptionLiteral = toObjectLiteral(
        createSwipeOptions(step),
        scrollableSelector ? { scrollableElement: "scrollableElement" } : {}
      );

      if (step.selector) {
        const selector = adapter.toDriverSelector(step.selector);
        lines.push(`    {`);
        if (scrollableSelector) {
          lines.push(
            `      const scrollableElement = await browser.$(${quote(
              scrollableSelector
            )});`
          );
        }
        lines.push(`      const element = await browser.$(${quote(selector)});`);
        lines.push(`      await element.scrollIntoView(${optionLiteral});`);
        lines.push(
          `      await element.waitForDisplayed({ timeout: ${step.timeoutMs ?? 10000} });`
        );
        lines.push(`    }`);
        return lines;
      }

      if (scrollableSelector) {
        lines.push(`    {`);
        lines.push(
          `      const scrollableElement = await browser.$(${quote(
            scrollableSelector
          )});`
        );
        lines.push(
          `      for (let i = 0; i < ${step.maxScrolls ?? 1}; i++) {`
        );
        lines.push(`        await browser.swipe(${swipeOptionLiteral});`);
        lines.push(`      }`);
        lines.push(`    }`);
        return lines;
      }

      lines.push(
        `    for (let i = 0; i < ${step.maxScrolls ?? 1}; i++) {`
      );
      lines.push(`      await browser.swipe(${toJson(createSwipeOptions(step))});`);
      lines.push(`    }`);
      return lines;
    }

    case "longPress": {
      const options = stripUndefined({
        x: step.x,
        y: step.y,
        duration: step.durationMs
      });

      if (step.selector) {
        const selector = adapter.toDriverSelector(step.selector);
        lines.push(`    {`);
        lines.push(`      const element = await browser.$(${quote(selector)});`);
        lines.push(
          `      await element.waitForDisplayed({ timeout: ${step.timeoutMs ?? 10000} });`
        );
        lines.push(`      await element.longPress(${toJson(options)});`);
        lines.push(`    }`);
        return lines;
      }

      lines.push(`    await browser`);
      lines.push(
        `      .action("pointer", { parameters: { pointerType: "touch" } })`
      );
      lines.push(
        `      .move({ x: ${step.x}, y: ${step.y}, duration: 0, origin: "viewport" })`
      );
      lines.push(`      .down({ button: 0 })`);
      lines.push(`      .pause(${step.durationMs ?? 1500})`);
      lines.push(`      .up({ button: 0 })`);
      lines.push(`      .perform();`);
      return lines;
    }

    case "hideKeyboard":
      lines.push(
        `    await browser.execute("mobile: hideKeyboard", ${toJson(
          stripUndefined({ keys: step.keys })
        )});`
      );
      return lines;

    case "deepLink":
      if (step.waitForLaunch === undefined) {
        lines.push(
          `    await browser.deepLink(${quote(step.url)}, ${quote(step.appIdentifier)});`
        );
      } else {
        lines.push(
          `    await browser.deepLink(${quote(step.url)}, ${quote(
            step.appIdentifier
          )}, ${step.waitForLaunch});`
        );
      }
      return lines;

    default: {
      const neverStep: never = step;
      throw new Error(`Unsupported flow step: ${JSON.stringify(neverStep)}`);
    }
  }
}

function createSwipeOptions(
  step: Extract<FlowStep, { action: "swipe" | "scroll" }>
) {
  return stripUndefined({
    direction: step.direction,
    duration: step.durationMs,
    percent: step.percent,
    from: step.from,
    to: step.to
  });
}

function createScrollOptions(step: Extract<FlowStep, { action: "scroll" }>) {
  return stripUndefined({
    direction: step.direction,
    maxScrolls: step.maxScrolls,
    duration: step.durationMs,
    percent: step.percent
  });
}

function resolveRuntime(flow: MobileFlow): MobileRuntime {
  if (flow.runtime) {
    return flow.runtime;
  }

  if (flow.platform === "ios") {
    return "ios-native";
  }

  if (flow.platform === "android") {
    return "android-native";
  }

  return "rn";
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function toJson(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

function toObjectLiteral(
  value: Record<string, unknown>,
  identifiers: Record<string, string>
): string {
  const parts = Object.entries(value).map(
    ([key, item]) => `${quote(key)}:${JSON.stringify(item)}`
  );

  for (const [key, identifier] of Object.entries(identifiers)) {
    parts.push(`${quote(key)}:${identifier}`);
  }

  return `{${parts.join(",")}}`;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "generated-flow";
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      delete value[key];
    }
  }

  return value;
}
