import type { ArtifactDirectory } from "../models/artifact.js";

export interface ArtifactStorage {
  getRunRoot(runId: string): string;
  ensureRun(runId: string, directories: ArtifactDirectory[]): Promise<string>;
  writeJson(runId: string, relativePath: string, data: unknown): Promise<string>;
  readJson<T>(runId: string, relativePath: string): Promise<T | undefined>;
  writeText(runId: string, relativePath: string, content: string): Promise<string>;
  readText(runId: string, relativePath: string): Promise<string | undefined>;
  writeBuffer(runId: string, relativePath: string, content: Buffer): Promise<string>;
  exists(runId: string, relativePath: string): Promise<boolean>;
  listFiles(runId: string, relativeDirectory?: string): Promise<string[]>;
}
