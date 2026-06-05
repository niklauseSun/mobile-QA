import { z } from "zod";

import {
  PlatformSchema,
  SemanticIdSchema,
  UIActionSchema
} from "../core/schema.js";

export const SemanticFlowStepSchema = z
  .object({
    action: UIActionSchema,
    target: SemanticIdSchema,
    value: z.string().optional()
  })
  .strict();

export const SemanticFlowSchema = z
  .object({
    name: z.string().trim().min(1),
    platform: PlatformSchema,
    steps: z.array(SemanticFlowStepSchema).min(1)
  })
  .strict();

export type SemanticFlowInput = z.infer<typeof SemanticFlowSchema>;
export type SemanticFlowStepInput = z.infer<typeof SemanticFlowStepSchema>;
