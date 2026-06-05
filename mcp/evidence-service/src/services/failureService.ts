import type { FailureRecord, FailureRequest } from "../models/run.js";
import { nowIso } from "../utils/time.js";
import type { ArtifactStorage } from "./artifactStorage.js";
import type { SanitizerService } from "./sanitizerService.js";

export class FailureService {
  constructor(
    private readonly storage: ArtifactStorage,
    private readonly sanitizer: SanitizerService
  ) {}

  async saveFailure(runId: string, request: FailureRequest): Promise<{ runId: string; path: string; failure: FailureRecord }> {
    const failure: FailureRecord = this.sanitizer.sanitizeJson({
      ...request,
      createdAt: nowIso()
    });
    const path = await this.storage.writeJson(runId, "failure.json", failure);

    return {
      runId,
      path,
      failure
    };
  }
}
