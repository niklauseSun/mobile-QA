import type { ArtifactRef } from "../models/artifact.js";
import type { FailureRecord, RunReportContext } from "../models/run.js";
import type { Timeline } from "../models/step.js";
import type { RunMeta } from "../models/meta.js";
import { escapeMarkdownTableCell, fencedJson } from "../utils/markdown.js";
import type { ArtifactStorage } from "./artifactStorage.js";

export class ReportService {
  constructor(private readonly storage: ArtifactStorage) {}

  async generate(runId: string): Promise<string> {
    const context = await this.buildContext(runId);
    const markdown = this.render(context);
    return this.storage.writeText(runId, "report.md", markdown);
  }

  private async buildContext(runId: string): Promise<RunReportContext> {
    const [meta, timeline, failure, artifactPaths] = await Promise.all([
      this.storage.readJson<RunMeta>(runId, "meta.json"),
      this.storage.readJson<Timeline>(runId, "timeline.json"),
      this.storage.readJson<FailureRecord>(runId, "failure.json"),
      this.storage.listFiles(runId)
    ]);

    if (!meta) {
      throw new Error(`meta.json not found for run ${runId}`);
    }

    const artifacts: ArtifactRef[] = artifactPaths
      .filter((path) => !["meta.json", "report.md", "junit.xml"].includes(path))
      .map((path) => ({
        path,
        type: inferArtifactType(path)
      }));

    return {
      meta,
      timeline,
      failure,
      artifacts
    };
  }

  private render(context: RunReportContext): string {
    const { meta, timeline, failure, artifacts } = context;
    const failedSteps = timeline?.steps.filter((step) => step.status === "failed") ?? [];
    const passedSteps = timeline?.steps.filter((step) => step.status === "passed") ?? [];
    const skippedSteps = timeline?.steps.filter((step) => step.status === "skipped") ?? [];

    return [
      `# Evidence Report: ${meta.name ?? meta.runId}`,
      "",
      "## Summary",
      "",
      "| Field | Value |",
      "| --- | --- |",
      `| Run ID | ${escapeMarkdownTableCell(meta.runId)} |`,
      `| Status | ${escapeMarkdownTableCell(meta.status)} |`,
      `| Task ID | ${escapeMarkdownTableCell(meta.taskId ?? "-")} |`,
      `| Flow | ${escapeMarkdownTableCell(meta.flowName ?? "-")} |`,
      `| Started At | ${escapeMarkdownTableCell(meta.startedAt)} |`,
      `| Ended At | ${escapeMarkdownTableCell(meta.endedAt ?? "-")} |`,
      `| Duration | ${escapeMarkdownTableCell(meta.durationMs !== undefined ? `${meta.durationMs} ms` : "-")} |`,
      `| Steps | ${timeline?.steps.length ?? 0} total, ${passedSteps.length} passed, ${failedSteps.length} failed, ${skippedSteps.length} skipped |`,
      "",
      "## Failure",
      "",
      this.renderFailure(failure, failedSteps[0]),
      "",
      "## Evidence",
      "",
      this.renderEvidence(artifacts),
      "",
      "## Reproduce",
      "",
      "1. Inspect `flow.json` for the original automation flow.",
      "2. Review `timeline.json` to identify the last successful step and the failed step.",
      "3. Open screenshots and page source linked in `failure.json` or the table above.",
      "4. If generated tests exist, run the files under `generated-tests/` against the same Appium capabilities and app build.",
      "",
      "## Environment",
      "",
      fencedJson(meta.environment ?? {}),
      ""
    ].join("\n");
  }

  private renderFailure(failure: FailureRecord | undefined, failedStep: unknown): string {
    if (!failure) {
      return "No `failure.json` was recorded for this run.";
    }

    return [
      `- Error: ${failure.error.message}`,
      `- Failed screenshot: ${failure.failedScreenshot ?? "-"}`,
      `- Before failure screenshot: ${failure.beforeFailureScreenshot ?? "-"}`,
      `- Page source: ${failure.pageSource ?? "-"}`,
      "",
      "Failed step:",
      "",
      fencedJson(failure.failedStep ?? failedStep ?? {})
    ].join("\n");
  }

  private renderEvidence(artifacts: ArtifactRef[]): string {
    if (artifacts.length === 0) {
      return "No artifacts were recorded.";
    }

    return [
      "| Type | Path |",
      "| --- | --- |",
      ...artifacts.map(
        (artifact) =>
          `| ${escapeMarkdownTableCell(artifact.type)} | ${escapeMarkdownTableCell(artifact.path)} |`
      )
    ].join("\n");
  }
}

function inferArtifactType(path: string): string {
  if (path.startsWith("screenshots/")) {
    return "screenshot";
  }

  if (path.startsWith("page-source/")) {
    return "page-source";
  }

  if (path.startsWith("logs/")) {
    return "log";
  }

  if (path.startsWith("generated-tests/")) {
    return "generated-test";
  }

  if (path === "flow.json") {
    return "flow";
  }

  return "artifact";
}
