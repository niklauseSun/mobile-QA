import path from "node:path";
import { getMobileSession } from "../appium/session.js";
import {
  hideKeyboard,
  openDeepLink,
  performLongPress,
  performScroll,
  performSwipe
} from "../appium/gestures.js";
import type { FlowStep, MobileFlow } from "./types.js";
import { createRunDir, ensureDir, writeTextFile } from "../evidence/artifact.js";
import { createArtifactResourceUri } from "../evidence/resources.js";
import { createJUnitReport, type JUnitTestCase } from "../reports/junit.js";

export async function runFlow(flow: MobileFlow) {
  const { driver, adapter } = getMobileSession();

  const runDir = createRunDir();
  const screenshotsDir = path.join(runDir, "screenshots");
  const pageSourceDir = path.join(runDir, "page-source");

  await ensureDir(screenshotsDir);
  await ensureDir(pageSourceDir);
  await writeTextFile(
    path.join(runDir, "flow.json"),
    JSON.stringify(flow, null, 2)
  );

  const results: string[] = [];
  const testCases: JUnitTestCase[] = [];
  const artifactPaths: string[] = [];

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    const stepNo = i + 1;
    const startedAt = Date.now();

    try {
      switch (step.action) {
        case "tap": {
          const selector = adapter.toDriverSelector(step.selector);
          const element = await driver.$(selector);
          await element.waitForDisplayed({ timeout: step.timeoutMs ?? 10000 });
          await element.click();
          results.push(`[${stepNo}] tap success: ${step.selector.value}`);
          break;
        }

        case "type": {
          const selector = adapter.toDriverSelector(step.selector);
          const element = await driver.$(selector);
          await element.waitForDisplayed({ timeout: step.timeoutMs ?? 10000 });

          if (step.clearFirst ?? true) {
            await element.clearValue();
          }

          await element.setValue(step.text);
          results.push(`[${stepNo}] type success: ${step.selector.value}`);
          break;
        }

        case "assertText": {
          const selector = adapter.textSelector(step.text);
          const element = await driver.$(selector);
          await element.waitForDisplayed({ timeout: step.timeoutMs ?? 10000 });
          results.push(`[${stepNo}] assertText success: ${step.text}`);
          break;
        }

        case "wait": {
          await driver.pause(step.ms);
          results.push(`[${stepNo}] wait success: ${step.ms}ms`);
          break;
        }

        case "screenshot": {
          const filePath = path.join(
            screenshotsDir,
            `${String(stepNo).padStart(3, "0")}-${step.name ?? "screenshot"}.png`
          );
          await driver.saveScreenshot(filePath);
          artifactPaths.push(filePath);
          results.push(`[${stepNo}] screenshot success: ${filePath}`);
          break;
        }

        case "back": {
          await driver.back();
          results.push(`[${stepNo}] back success`);
          break;
        }

        case "swipe": {
          await performSwipe(driver, step);
          results.push(`[${stepNo}] swipe success: ${step.direction ?? "default"}`);
          break;
        }

        case "scroll": {
          await performScroll(driver, adapter, step);
          results.push(`[${stepNo}] scroll success: ${describeScrollStep(step)}`);
          break;
        }

        case "longPress": {
          await performLongPress(driver, adapter, step);
          results.push(`[${stepNo}] longPress success: ${describeLongPressStep(step)}`);
          break;
        }

        case "hideKeyboard": {
          await hideKeyboard(driver, step);
          results.push(`[${stepNo}] hideKeyboard success`);
          break;
        }

        case "deepLink": {
          await openDeepLink(driver, step);
          results.push(`[${stepNo}] deepLink success: ${step.url}`);
          break;
        }

        default: {
          const neverStep: never = step;
          throw new Error(`Unsupported flow step: ${JSON.stringify(neverStep)}`);
        }
      }

      testCases.push({
        name: createTestCaseName(stepNo, step),
        timeMs: Date.now() - startedAt
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      testCases.push({
        name: createTestCaseName(stepNo, step),
        timeMs: Date.now() - startedAt,
        failureMessage: message
      });

      results.push(`[${stepNo}] failed: ${message}`);
      try {
        const failedScreenshot = path.join(
          screenshotsDir,
          `${String(stepNo).padStart(3, "0")}-failed.png`
        );
        const failedSource = path.join(
          pageSourceDir,
          `${String(stepNo).padStart(3, "0")}-failed.xml`
        );

        await driver.saveScreenshot(failedScreenshot);
        await writeTextFile(failedSource, await driver.getPageSource());
        artifactPaths.push(failedScreenshot, failedSource);
      } catch (evidenceError) {
        const evidenceMessage =
          evidenceError instanceof Error ? evidenceError.message : String(evidenceError);
        results.push(`[${stepNo}] evidence collection failed: ${evidenceMessage}`);
      }

      artifactPaths.push(
        ...(await writeReports(runDir, flow.name, results, testCases))
      );

      throw new Error(
        [
          `Flow "${flow.name}" failed at step ${stepNo}: ${message}`,
          `Artifacts: ${runDir}`,
          ...formatArtifactResources(artifactPaths)
        ].join("\n")
      );
    }
  }

  artifactPaths.push(
    ...(await writeReports(runDir, flow.name, results, testCases))
  );

  return {
    runDir,
    results,
    resources: toArtifactResourceUris(artifactPaths)
  };
}

async function writeReports(
  runDir: string,
  flowName: string,
  results: string[],
  testCases: JUnitTestCase[]
) {
  const reportPath = path.join(runDir, "report.md");
  const junitPath = path.join(runDir, "junit.xml");

  await writeTextFile(reportPath, createMarkdownReport(flowName, results));
  await writeTextFile(
    junitPath,
    createJUnitReport({
      suiteName: flowName,
      testCases
    })
  );

  return [reportPath, junitPath];
}

function createTestCaseName(stepNo: number, step: FlowStep): string {
  switch (step.action) {
    case "tap":
    case "type":
      return `[${stepNo}] ${step.action} ${step.selector.strategy}=${step.selector.value}`;

    case "assertText":
      return `[${stepNo}] assertText ${step.text}`;

    case "wait":
      return `[${stepNo}] wait ${step.ms}ms`;

    case "screenshot":
      return `[${stepNo}] screenshot ${step.name ?? "screenshot"}`;

    case "back":
      return `[${stepNo}] back`;

    case "swipe":
      return `[${stepNo}] swipe ${step.direction ?? "default"}`;

    case "scroll":
      return `[${stepNo}] scroll ${describeScrollStep(step)}`;

    case "longPress":
      return `[${stepNo}] longPress ${describeLongPressStep(step)}`;

    case "hideKeyboard":
      return `[${stepNo}] hideKeyboard`;

    case "deepLink":
      return `[${stepNo}] deepLink ${step.url}`;

    default: {
      const neverStep: never = step;
      return `[${stepNo}] unsupported ${JSON.stringify(neverStep)}`;
    }
  }
}

function createMarkdownReport(flowName: string, results: string[]) {
  return [
    `# Mobile Flow Report`,
    ``,
    `- Flow: ${flowName}`,
    `- Result: ${results.some((item) => item.includes("failed")) ? "FAILED" : "PASSED"}`,
    ``,
    `## Steps`,
    ``,
    ...results.map((item) => `- ${item}`),
    ``
  ].join("\n");
}

function formatArtifactResources(artifactPaths: string[]) {
  const resourceUris = toArtifactResourceUris(artifactPaths);

  if (resourceUris.length === 0) {
    return [];
  }

  return ["Resources:", ...resourceUris.map((uri) => `- ${uri}`)];
}

function toArtifactResourceUris(artifactPaths: string[]) {
  return [...new Set(artifactPaths.map((filePath) => createArtifactResourceUri(filePath)))];
}

function describeScrollStep(step: Extract<FlowStep, { action: "scroll" }>) {
  if (step.selector) {
    return `${step.selector.strategy}=${step.selector.value}`;
  }

  return `${step.direction ?? "default"} x${step.maxScrolls ?? 1}`;
}

function describeLongPressStep(step: Extract<FlowStep, { action: "longPress" }>) {
  if (step.selector) {
    return `${step.selector.strategy}=${step.selector.value}`;
  }

  return `x=${step.x}, y=${step.y}`;
}
