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

    default: {
      const neverStep: never = step;
      throw new Error(`Unsupported flow step: ${JSON.stringify(neverStep)}`);
    }
  }
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

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "generated-flow";
}
