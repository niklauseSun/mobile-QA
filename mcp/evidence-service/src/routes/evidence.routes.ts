import type { FastifyInstance } from "fastify";
import { z, type ZodSchema } from "zod";

import {
  FailureRequestSchema,
  FinishRunRequestSchema,
  SaveFlowRequestSchema,
  SaveGeneratedTestRequestSchema,
  SaveLogRequestSchema,
  SavePageSourceRequestSchema,
  SaveScreenshotRequestSchema,
  StartRunRequestSchema,
  StepRecordRequestSchema,
  type FailureRequest,
  type FinishRunRequest,
  type SaveFlowRequest,
  type SaveGeneratedTestRequest,
  type SaveLogRequest,
  type SavePageSourceRequest,
  type SaveScreenshotRequest,
  type StartRunRequest,
  type StepRecordRequest
} from "../models/run.js";
import { ServiceError } from "../models/error.js";
import type { FailureService } from "../services/failureService.js";
import type { LogService } from "../services/logService.js";
import type { PageSourceService } from "../services/pageSourceService.js";
import type { RunService } from "../services/runService.js";
import type { ScreenshotService } from "../services/screenshotService.js";
import type { StepService } from "../services/stepService.js";

export interface EvidenceRouteServices {
  runService: RunService;
  stepService: StepService;
  screenshotService: ScreenshotService;
  pageSourceService: PageSourceService;
  logService: LogService;
  failureService: FailureService;
}

const RunParamsSchema = z.object({
  runId: z.string().min(1).max(200).regex(/^[a-zA-Z0-9._-]+$/)
});

type RunParams = z.infer<typeof RunParamsSchema>;

export async function registerEvidenceRoutes(
  fastify: FastifyInstance,
  services: EvidenceRouteServices
): Promise<void> {
  fastify.post<{ Body: StartRunRequest }>("/evidence/runs/start", async (request) => {
    const body = parseBody(StartRunRequestSchema, request.body ?? {});
    const result = await services.runService.startRun(body);
    return { data: result };
  });

  fastify.post<{ Params: RunParams; Body: SaveFlowRequest }>(
    "/evidence/runs/:runId/flow",
    async (request) => {
      const { runId } = parseParams(request.params);
      const body = parseBody(SaveFlowRequestSchema, request.body);
      const result = await services.runService.saveFlow(runId, body);
      return { data: result };
    }
  );

  fastify.post<{ Params: RunParams; Body: SaveGeneratedTestRequest }>(
    "/evidence/runs/:runId/generated-test",
    async (request) => {
      const { runId } = parseParams(request.params);
      const body = parseBody(SaveGeneratedTestRequestSchema, request.body);
      const result = await services.runService.saveGeneratedTest(runId, body);
      return { data: result };
    }
  );

  fastify.post<{ Params: RunParams; Body: StepRecordRequest }>(
    "/evidence/runs/:runId/steps",
    async (request) => {
      const { runId } = parseParams(request.params);
      const body = parseBody(StepRecordRequestSchema, request.body);
      const result = await services.stepService.recordStep(runId, body);
      return { data: result };
    }
  );

  fastify.post<{ Params: RunParams; Body: SaveScreenshotRequest }>(
    "/evidence/runs/:runId/screenshots",
    async (request) => {
      const { runId } = parseParams(request.params);
      const body = parseBody(SaveScreenshotRequestSchema, request.body);
      const result = await services.screenshotService.saveScreenshot(runId, body);
      return { data: result };
    }
  );

  fastify.post<{ Params: RunParams; Body: SavePageSourceRequest }>(
    "/evidence/runs/:runId/page-source",
    async (request) => {
      const { runId } = parseParams(request.params);
      const body = parseBody(SavePageSourceRequestSchema, request.body);
      const result = await services.pageSourceService.savePageSource(runId, body);
      return { data: result };
    }
  );

  fastify.post<{ Params: RunParams; Body: SaveLogRequest }>(
    "/evidence/runs/:runId/logs",
    async (request) => {
      const { runId } = parseParams(request.params);
      const body = parseBody(SaveLogRequestSchema, request.body);
      const result = await services.logService.saveLog(runId, body);
      return { data: result };
    }
  );

  fastify.post<{ Params: RunParams; Body: FailureRequest }>(
    "/evidence/runs/:runId/failure",
    async (request) => {
      const { runId } = parseParams(request.params);
      const body = parseBody(FailureRequestSchema, request.body);
      const result = await services.failureService.saveFailure(runId, body);
      return { data: result };
    }
  );

  fastify.post<{ Params: RunParams; Body: FinishRunRequest }>(
    "/evidence/runs/:runId/finish",
    async (request) => {
      const { runId } = parseParams(request.params);
      const body = parseBody(FinishRunRequestSchema, request.body);
      const result = await services.runService.finishRun(runId, body);
      return { data: result };
    }
  );
}

function parseParams(params: unknown): RunParams {
  return parseBody(RunParamsSchema, params);
}

function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "Invalid request payload",
      parsed.error.flatten()
    );
  }

  return parsed.data;
}
