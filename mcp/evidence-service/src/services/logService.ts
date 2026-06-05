import type { SavedArtifactResult, SaveLogRequest } from "../models/run.js";
import type { ArtifactStorage } from "./artifactStorage.js";
import type { SanitizerService } from "./sanitizerService.js";

export class LogService {
  constructor(
    private readonly storage: ArtifactStorage,
    private readonly sanitizer: SanitizerService
  ) {}

  async saveLog(runId: string, request: SaveLogRequest): Promise<SavedArtifactResult> {
    const content = this.sanitizer.sanitizeText(request.content);
    const path = await this.storage.writeText(runId, `logs/${request.type}.log`, content);
    const artifact = {
      path,
      type: `log:${request.type}`,
      name: request.type
    };

    return {
      runId,
      path,
      artifact
    };
  }
}
