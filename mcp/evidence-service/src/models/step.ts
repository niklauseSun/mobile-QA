import type { EvidenceError } from "./error.js";
import type { EvidenceRef } from "./artifact.js";

export type StepStatus = "running" | "passed" | "failed" | "skipped";

export interface StepRecord {
  stepId: string;
  index: number;
  name: string;
  action: string;
  status: StepStatus;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  error?: EvidenceError;
  evidence?: EvidenceRef;
}

export interface Timeline {
  runId: string;
  updatedAt: string;
  steps: StepRecord[];
}
