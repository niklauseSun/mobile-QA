import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";

import { isServiceError } from "./models/error.js";
import { registerEvidenceRoutes } from "./routes/evidence.routes.js";
import { FailureService } from "./services/failureService.js";
import { JunitService } from "./services/junitService.js";
import { LogService } from "./services/logService.js";
import { PageSourceService } from "./services/pageSourceService.js";
import { ReportService } from "./services/reportService.js";
import { RunService } from "./services/runService.js";
import { SanitizerService } from "./services/sanitizerService.js";
import { ScreenshotService } from "./services/screenshotService.js";
import { StepService } from "./services/stepService.js";
import { LocalArtifactStorage } from "./storage/localArtifactStorage.js";

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    },
    bodyLimit: Number(process.env.BODY_LIMIT_BYTES ?? 25 * 1024 * 1024)
  });

  await fastify.register(cors, {
    origin: false
  });

  const storage = new LocalArtifactStorage();
  const sanitizer = new SanitizerService();
  const reportService = new ReportService(storage);
  const junitService = new JunitService(storage);
  const runService = new RunService(storage, sanitizer, reportService, junitService);
  const stepService = new StepService(storage, sanitizer);
  const screenshotService = new ScreenshotService(storage, stepService);
  const pageSourceService = new PageSourceService(storage, sanitizer, stepService);
  const logService = new LogService(storage, sanitizer);
  const failureService = new FailureService(storage, sanitizer);

  fastify.setErrorHandler((error, request, reply) => {
    if (isServiceError(error)) {
      request.log.warn({ code: error.code, details: error.details }, error.message);
      void reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
      return;
    }

    request.log.error({ err: error }, "unhandled request error");
    void reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error"
      }
    });
  });

  await registerEvidenceRoutes(fastify, {
    runService,
    stepService,
    screenshotService,
    pageSourceService,
    logService,
    failureService
  });

  return fastify;
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const port = Number(process.env.PORT ?? 8790);
  const host = process.env.HOST ?? "0.0.0.0";
  const fastify = await buildServer();

  const shutdown = async (): Promise<void> => {
    await fastify.close();
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  await fastify.listen({ port, host });
}
