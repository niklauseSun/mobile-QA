import path from "node:path";
import { getMobileSession } from "../appium/session.js";
import type { MobileFlow } from "./types.js";
import { createRunDir, ensureDir, writeTextFile } from "../evidence/artifact.js";

export async function runFlow(flow: MobileFlow) {
  const { driver, adapter } = getMobileSession();

  const runDir = createRunDir();
  const screenshotsDir = path.join(runDir, "screenshots");
  const pageSourceDir = path.join(runDir, "page-source");

  await ensureDir(screenshotsDir);
  await ensureDir(pageSourceDir);
  await writeTextFile(path.join(runDir, "flow.json"), JSON.stringify(flow, null, 2));

  const results: string[] = [];

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    const stepNo = i + 1;

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
          results.push(`[${stepNo}] screenshot success: ${filePath}`);
          break;
        }

        case "back": {
          await driver.back();
          results.push(`[${stepNo}] back success`);
          break;
        }

        default: {
          const neverStep: never = step;
          throw new Error(`Unsupported flow step: ${JSON.stringify(neverStep)}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

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

      results.push(`[${stepNo}] failed: ${message}`);
      await writeTextFile(path.join(runDir, "report.md"), createMarkdownReport(flow.name, results));

      throw new Error(
        `Flow "${flow.name}" failed at step ${stepNo}: ${message}\nArtifacts: ${runDir}`
      );
    }
  }

  await writeTextFile(path.join(runDir, "report.md"), createMarkdownReport(flow.name, results));

  return {
    runDir,
    results
  };
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