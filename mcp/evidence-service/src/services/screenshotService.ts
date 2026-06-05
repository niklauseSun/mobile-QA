import type { SavedArtifactResult, SaveScreenshotRequest } from "../models/run.js";
import { ServiceError } from "../models/error.js";
import { withIndex } from "../utils/fileName.js";
import type { ArtifactStorage } from "./artifactStorage.js";
import type { StepService } from "./stepService.js";

export class ScreenshotService {
  constructor(
    private readonly storage: ArtifactStorage,
    private readonly stepService: StepService
  ) {}

  async saveScreenshot(runId: string, request: SaveScreenshotRequest): Promise<SavedArtifactResult> {
    const index = await this.stepService.getStepIndex(runId, request.stepId);
    const fileName = withIndex(index, `${request.kind}-${request.name}`, "png");
    const imageBuffer = this.decodeBase64Png(request.fileBase64);
    const path = await this.storage.writeBuffer(runId, `screenshots/${fileName}`, imageBuffer);
    const artifact = {
      path,
      type: `screenshot:${request.kind}`,
      name: request.name
    };

    await this.stepService.addEvidence(runId, request.stepId, "screenshots", artifact);

    return {
      runId,
      path,
      artifact
    };
  }

  private decodeBase64Png(value: string): Buffer {
    const normalized = value.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(normalized, "base64");

    if (buffer.length === 0) {
      throw new ServiceError(400, "INVALID_SCREENSHOT", "Screenshot payload is empty");
    }

    return buffer;
  }
}
