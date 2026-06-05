import type { ArtifactRef } from "../models/artifact.js";
import type { StepRecord, Timeline } from "../models/step.js";
import type { StepRecordRequest } from "../models/run.js";
import { ServiceError } from "../models/error.js";
import { nowIso } from "../utils/time.js";
import type { ArtifactStorage } from "./artifactStorage.js";
import type { SanitizerService } from "./sanitizerService.js";

export class StepService {
  private readonly queues = new Map<string, Promise<void>>();

  constructor(
    private readonly storage: ArtifactStorage,
    private readonly sanitizer: SanitizerService
  ) {}

  async recordStep(runId: string, input: StepRecordRequest): Promise<Timeline> {
    return this.withRunQueue(runId, async () => {
      const timeline = await this.readTimeline(runId);
      const sanitizedStep = this.sanitizer.sanitizeJson({
        ...input,
        evidence: input.evidence
      }) as StepRecord;
      const index = timeline.steps.findIndex((step) => step.stepId === sanitizedStep.stepId);

      if (index >= 0) {
        timeline.steps[index] = {
          ...timeline.steps[index],
          ...sanitizedStep
        };
      } else {
        timeline.steps.push(sanitizedStep);
      }

      timeline.steps.sort((left, right) => left.index - right.index);
      timeline.updatedAt = nowIso();
      await this.storage.writeJson(runId, "timeline.json", timeline);
      return timeline;
    });
  }

  async addEvidence(
    runId: string,
    stepId: string,
    bucket: keyof NonNullable<StepRecord["evidence"]>,
    artifact: ArtifactRef
  ): Promise<void> {
    await this.withRunQueue(runId, async () => {
      const timeline = await this.readTimeline(runId);
      const step = timeline.steps.find((candidate) => candidate.stepId === stepId);

      if (!step) {
        return;
      }

      step.evidence = step.evidence ?? {};
      const evidenceList = step.evidence[bucket] ?? [];
      step.evidence[bucket] = [...evidenceList, artifact];
      timeline.updatedAt = nowIso();
      await this.storage.writeJson(runId, "timeline.json", timeline);
    });
  }

  async getStepIndex(runId: string, stepId: string): Promise<number> {
    const timeline = await this.readTimeline(runId);
    const step = timeline.steps.find((candidate) => candidate.stepId === stepId);

    if (!step) {
      return timeline.steps.length;
    }

    return step.index;
  }

  async readTimeline(runId: string): Promise<Timeline> {
    const timeline = await this.storage.readJson<Timeline>(runId, "timeline.json");

    if (!timeline) {
      throw new ServiceError(404, "RUN_NOT_FOUND", `Run ${runId} not found`);
    }

    return timeline;
  }

  private async withRunQueue<T>(runId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(runId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queue = previous.then(() => current);
    this.queues.set(runId, queue);

    await previous;

    try {
      return await operation();
    } finally {
      release();

      if (this.queues.get(runId) === queue) {
        this.queues.delete(runId);
      }
    }
  }
}
