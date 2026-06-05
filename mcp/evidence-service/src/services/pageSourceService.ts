import type { SavedArtifactResult, SavePageSourceRequest } from "../models/run.js";
import { safeFileName } from "../utils/fileName.js";
import type { ArtifactStorage } from "./artifactStorage.js";
import type { SanitizerService } from "./sanitizerService.js";
import type { StepService } from "./stepService.js";

export class PageSourceService {
  constructor(
    private readonly storage: ArtifactStorage,
    private readonly sanitizer: SanitizerService,
    private readonly stepService: StepService
  ) {}

  async savePageSource(runId: string, request: SavePageSourceRequest): Promise<SavedArtifactResult> {
    const fileName = safeFileName(`${request.name}.xml`, "page-source");
    const content = this.sanitizer.sanitizeText(request.source);
    const path = await this.storage.writeText(runId, `page-source/${fileName}`, content);
    const artifact = {
      path,
      type: "page-source",
      name: request.name
    };

    await this.stepService.addEvidence(runId, request.stepId, "pageSources", artifact);

    return {
      runId,
      path,
      artifact
    };
  }
}
