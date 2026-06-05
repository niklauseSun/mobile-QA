import type { FailureRecord } from "../models/run.js";
import type { RunMeta } from "../models/meta.js";
import type { Timeline, StepRecord } from "../models/step.js";
import { escapeXml } from "../utils/xml.js";
import type { ArtifactStorage } from "./artifactStorage.js";

export class JunitService {
  constructor(private readonly storage: ArtifactStorage) {}

  async generate(runId: string): Promise<string> {
    const [meta, timeline, failure, artifactPaths] = await Promise.all([
      this.storage.readJson<RunMeta>(runId, "meta.json"),
      this.storage.readJson<Timeline>(runId, "timeline.json"),
      this.storage.readJson<FailureRecord>(runId, "failure.json"),
      this.storage.listFiles(runId)
    ]);

    if (!meta) {
      throw new Error(`meta.json not found for run ${runId}`);
    }

    const testCases = timeline?.steps.length
      ? timeline.steps.map((step) => this.renderStepTestcase(runId, step))
      : [this.renderRunTestcase(runId, meta, failure)];
    const failures = timeline?.steps.filter((step) => step.status === "failed").length ?? (isFailed(meta.status) ? 1 : 0);
    const skipped = timeline?.steps.filter((step) => step.status === "skipped").length ?? 0;
    const timeSeconds = ((meta.durationMs ?? 0) / 1000).toFixed(3);
    const artifactOutput = escapeXml(artifactPaths.join("\n"));
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<testsuite name="${escapeXml(meta.name ?? runId)}" tests="${testCases.length}" failures="${failures}" errors="0" skipped="${skipped}" time="${timeSeconds}" timestamp="${escapeXml(meta.startedAt)}">`,
      `  <properties>`,
      `    <property name="runId" value="${escapeXml(runId)}"/>`,
      `    <property name="status" value="${escapeXml(meta.status)}"/>`,
      `    <property name="taskId" value="${escapeXml(meta.taskId ?? "")}"/>`,
      `  </properties>`,
      ...testCases,
      `  <system-out>${artifactOutput}</system-out>`,
      `</testsuite>`,
      ""
    ].join("\n");

    return this.storage.writeText(runId, "junit.xml", xml);
  }

  private renderStepTestcase(runId: string, step: StepRecord): string {
    const timeSeconds = ((step.durationMs ?? 0) / 1000).toFixed(3);
    const lines = [
      `  <testcase classname="${escapeXml(runId)}" name="${escapeXml(`${step.index}. ${step.name}`)}" time="${timeSeconds}">`
    ];

    if (step.status === "failed") {
      const message = step.error?.message ?? "Step failed";
      const details = step.error ? JSON.stringify(step.error, null, 2) : message;
      lines.push(
        `    <failure message="${escapeXml(message)}" type="${escapeXml(step.error?.name ?? "StepFailure")}">${escapeXml(details)}</failure>`
      );
    }

    if (step.status === "skipped") {
      lines.push(`    <skipped/>`);
    }

    lines.push(`  </testcase>`);
    return lines.join("\n");
  }

  private renderRunTestcase(runId: string, meta: RunMeta, failure: FailureRecord | undefined): string {
    const lines = [`  <testcase classname="${escapeXml(runId)}" name="${escapeXml(meta.name ?? "run")}" time="${((meta.durationMs ?? 0) / 1000).toFixed(3)}">`];

    if (isFailed(meta.status)) {
      const message = failure?.error.message ?? `Run finished with status ${meta.status}`;
      lines.push(
        `    <failure message="${escapeXml(message)}" type="${escapeXml(failure?.error.name ?? "RunFailure")}">${escapeXml(JSON.stringify(failure ?? meta, null, 2))}</failure>`
      );
    }

    lines.push(`  </testcase>`);
    return lines.join("\n");
  }
}

function isFailed(status: RunMeta["status"]): boolean {
  return status === "failed" || status === "error";
}
