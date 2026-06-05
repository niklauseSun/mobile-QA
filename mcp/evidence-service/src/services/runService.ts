import { randomUUID } from "node:crypto";

import type { ArtifactDirectory } from "../models/artifact.js";
import { ServiceError } from "../models/error.js";
import type { RunMeta } from "../models/meta.js";
import type {
  FinishRunRequest,
  FinishRunResult,
  SaveFlowRequest,
  SaveGeneratedTestRequest,
  StartRunRequest,
  StartRunResult
} from "../models/run.js";
import type { Timeline } from "../models/step.js";
import { safeFileName } from "../utils/fileName.js";
import { compactTimestamp, durationMs, nowIso } from "../utils/time.js";
import type { ArtifactStorage } from "./artifactStorage.js";
import type { JunitService } from "./junitService.js";
import type { ReportService } from "./reportService.js";
import type { SanitizerService } from "./sanitizerService.js";

const RUN_DIRECTORIES: ArtifactDirectory[] = [
  "screenshots",
  "page-source",
  "logs",
  "generated-tests",
  "attachments"
];

export class RunService {
  constructor(
    private readonly storage: ArtifactStorage,
    private readonly sanitizer: SanitizerService,
    private readonly reportService: ReportService,
    private readonly junitService: JunitService
  ) {}

  async startRun(request: StartRunRequest): Promise<StartRunResult> {
    const runId = `run-${compactTimestamp()}-${randomUUID().slice(0, 8)}`;
    const rootPath = await this.storage.ensureRun(runId, RUN_DIRECTORIES);
    const startedAt = nowIso();
    const meta: RunMeta = this.sanitizer.sanitizeJson({
      runId,
      name: request.name,
      status: "running",
      startedAt,
      taskId: request.taskId,
      flowName: request.flowName,
      environment: request.environment,
      tags: request.tags
    });
    const timeline: Timeline = {
      runId,
      updatedAt: startedAt,
      steps: []
    };

    await this.storage.writeJson(runId, "meta.json", meta);
    await this.storage.writeJson(runId, "timeline.json", timeline);

    return {
      runId,
      rootPath,
      metaPath: "meta.json"
    };
  }

  async saveFlow(runId: string, request: SaveFlowRequest): Promise<{ runId: string; path: string }> {
    await this.assertRunExists(runId);
    const sanitizedFlow = this.sanitizer.sanitizeJson(request.flow);
    const path = await this.storage.writeJson(runId, "flow.json", sanitizedFlow);
    return { runId, path };
  }

  async saveGeneratedTest(
    runId: string,
    request: SaveGeneratedTestRequest
  ): Promise<{ runId: string; path: string }> {
    await this.assertRunExists(runId);
    const fileName = safeFileName(request.fileName, "generated-test");
    const path = await this.storage.writeText(runId, `generated-tests/${fileName}`, request.content);
    return { runId, path };
  }

  async finishRun(runId: string, request: FinishRunRequest): Promise<FinishRunResult> {
    const meta = await this.getMeta(runId);
    const endedAt = nowIso();
    const updatedMeta: RunMeta = this.sanitizer.sanitizeJson({
      ...meta,
      status: request.status,
      endedAt,
      durationMs: durationMs(meta.startedAt, endedAt)
    });

    await this.storage.writeJson(runId, "meta.json", updatedMeta);

    if (request.error) {
      const existingFailure = await this.storage.readJson<unknown>(runId, "failure.json");

      if (!existingFailure) {
        await this.storage.writeJson(runId, "failure.json", {
          failedStep: undefined,
          error: this.sanitizer.sanitizeJson(request.error),
          createdAt: endedAt
        });
      }
    }

    let reportPath = "report.md";
    let junitPath = "junit.xml";

    try {
      reportPath = await this.reportService.generate(runId);
    } catch (error) {
      reportPath = await this.writeFallbackReport(runId, error);
    }

    try {
      junitPath = await this.junitService.generate(runId);
    } catch (error) {
      junitPath = await this.writeFallbackJunit(runId, error);
    }

    return {
      runId,
      status: request.status,
      reportPath,
      junitPath,
      metaPath: "meta.json"
    };
  }

  async getMeta(runId: string): Promise<RunMeta> {
    const meta = await this.storage.readJson<RunMeta>(runId, "meta.json");

    if (!meta) {
      throw new ServiceError(404, "RUN_NOT_FOUND", `Run ${runId} not found`);
    }

    return meta;
  }

  private async assertRunExists(runId: string): Promise<void> {
    if (!(await this.storage.exists(runId, "meta.json"))) {
      throw new ServiceError(404, "RUN_NOT_FOUND", `Run ${runId} not found`);
    }
  }

  private async writeFallbackReport(runId: string, error: unknown): Promise<string> {
    return this.storage.writeText(
      runId,
      "report.md",
      `# Evidence Report\n\n## Summary\n\nReport generation failed.\n\n## Failure\n\n${formatError(error)}\n`
    );
  }

  private async writeFallbackJunit(runId: string, error: unknown): Promise<string> {
    const message = escapeXml(formatError(error));
    return this.storage.writeText(
      runId,
      "junit.xml",
      `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="${runId}" tests="1" failures="1" errors="0" skipped="0"><testcase classname="${runId}" name="report-generation"><failure message="${message}">${message}</failure></testcase></testsuite>\n`
    );
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
