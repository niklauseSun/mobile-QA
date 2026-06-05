export type RunStatus = "running" | "passed" | "failed" | "error" | "cancelled";

export interface RunEnvironment {
  device?: Record<string, unknown>;
  app?: Record<string, unknown>;
  gitCommit?: string;
  branch?: string;
  ci?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RunMeta {
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
}
