export type ArtifactDirectory =
  | "screenshots"
  | "page-source"
  | "logs"
  | "generated-tests"
  | "attachments";

export interface ArtifactRef {
  path: string;
  type: string;
  name?: string;
}

export interface EvidenceRef {
  screenshots?: ArtifactRef[];
  pageSources?: ArtifactRef[];
  logs?: ArtifactRef[];
  attachments?: ArtifactRef[];
  generatedTests?: ArtifactRef[];
}
