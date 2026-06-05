import { z } from "zod";

import type { ArtifactRef } from "./artifact.js";
import type { EvidenceError } from "./error.js";
import type { RunEnvironment, RunStatus } from "./meta.js";
import type { StepRecord } from "./step.js";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema)
  ])
);

export const RunStatusSchema = z.enum(["running", "passed", "failed", "error", "cancelled"]);

export const StartRunRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  taskId: z.string().min(1).max(200).optional(),
  flowName: z.string().min(1).max(200).optional(),
  environment: z.record(z.unknown()).optional(),
  tags: z.array(z.string().min(1).max(80)).optional()
});

export type StartRunRequest = z.infer<typeof StartRunRequestSchema>;

export const SaveFlowRequestSchema = z.object({
  flow: z.unknown()
});

export type SaveFlowRequest = z.infer<typeof SaveFlowRequestSchema>;

export const SaveGeneratedTestRequestSchema = z.object({
  fileName: z.string().min(1).max(240),
  content: z.string()
});

export type SaveGeneratedTestRequest = z.infer<typeof SaveGeneratedTestRequestSchema>;

export const StepStatusSchema = z.enum(["running", "passed", "failed", "skipped"]);

export const EvidenceErrorSchema = z.object({
  message: z.string(),
  name: z.string().optional(),
  stack: z.string().optional(),
  code: z.string().optional(),
  details: z.unknown().optional()
});

export const StepRecordRequestSchema = z.object({
  stepId: z.string().min(1).max(200),
  index: z.number().int().nonnegative(),
  name: z.string().min(1).max(240),
  action: z.string().min(1).max(200),
  status: StepStatusSchema,
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  error: EvidenceErrorSchema.optional(),
  evidence: z.record(z.unknown()).optional()
});

export type StepRecordRequest = z.infer<typeof StepRecordRequestSchema>;

export const ScreenshotKindSchema = z.enum(["before", "after", "failure"]);

export const SaveScreenshotRequestSchema = z.object({
  stepId: z.string().min(1).max(200),
  name: z.string().min(1).max(240),
  kind: ScreenshotKindSchema,
  fileBase64: z.string().min(1)
});

export type SaveScreenshotRequest = z.infer<typeof SaveScreenshotRequestSchema>;
export type ScreenshotKind = z.infer<typeof ScreenshotKindSchema>;

export const SavePageSourceRequestSchema = z.object({
  stepId: z.string().min(1).max(200),
  name: z.string().min(1).max(240),
  source: z.string()
});

export type SavePageSourceRequest = z.infer<typeof SavePageSourceRequestSchema>;

export const LogTypeSchema = z.enum([
  "appium",
  "android-logcat",
  "ios-syslog",
  "runner",
  "network"
]);

export const SaveLogRequestSchema = z.object({
  type: LogTypeSchema,
  content: z.string()
});

export type SaveLogRequest = z.infer<typeof SaveLogRequestSchema>;
export type LogType = z.infer<typeof LogTypeSchema>;

export interface FailureRequest {
  failedStep: JsonValue;
  error: EvidenceError;
  previousStep?: JsonValue;
  beforeFailureScreenshot?: string;
  failedScreenshot?: string;
  pageSource?: string;
  device?: Record<string, unknown>;
  app?: Record<string, unknown>;
  gitCommit?: string;
  network?: JsonValue;
  relatedFiles?: string[];
}

export const FailureRequestSchema: z.ZodType<FailureRequest> = z.object({
  failedStep: JsonValueSchema,
  error: EvidenceErrorSchema,
  previousStep: JsonValueSchema.optional(),
  beforeFailureScreenshot: z.string().optional(),
  failedScreenshot: z.string().optional(),
  pageSource: z.string().optional(),
  device: z.record(z.unknown()).optional(),
  app: z.record(z.unknown()).optional(),
  gitCommit: z.string().optional(),
  network: JsonValueSchema.optional(),
  relatedFiles: z.array(z.string()).optional()
});

export interface FailureRecord {
  failedStep: JsonValue;
  error: EvidenceError;
  previousStep?: JsonValue;
  beforeFailureScreenshot?: string;
  failedScreenshot?: string;
  pageSource?: string;
  device?: Record<string, unknown>;
  app?: Record<string, unknown>;
  gitCommit?: string;
  network?: JsonValue;
  relatedFiles?: string[];
  createdAt: string;
}

export const FinishRunRequestSchema = z.object({
  status: RunStatusSchema.exclude(["running"]),
  error: EvidenceErrorSchema.optional()
});

export type FinishRunRequest = z.infer<typeof FinishRunRequestSchema>;

export interface StartRunResult {
  runId: string;
  rootPath: string;
  metaPath: string;
}

export interface SavedArtifactResult {
  runId: string;
  path: string;
  artifact: ArtifactRef;
}

export interface FinishRunResult {
  runId: string;
  status: Exclude<RunStatus, "running">;
  reportPath: string;
  junitPath: string;
  metaPath: string;
}

export type RunReportContext = {
  meta: {
    runId: string;
    name?: string;
    status: RunStatus;
    startedAt: string;
    endedAt?: string;
    durationMs?: number;
    taskId?: string;
    flowName?: string;
    environment?: RunEnvironment;
    tags?: string[];
  };
  timeline?: {
    runId: string;
    updatedAt: string;
    steps: StepRecord[];
  };
  failure?: FailureRecord;
  artifacts: ArtifactRef[];
};
