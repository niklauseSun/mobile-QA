import { z } from "zod";

export const selectorSchema = z.object({
  strategy: z.enum([
    "accessibilityId",
    "testId",
    "resourceId",
    "iosPredicate",
    "iosClassChain",
    "text",
    "xpath",
    "css"
  ]),
  value: z.string()
});

export const directionSchema = z.enum(["up", "down", "left", "right"]);

export const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite()
});

export const gestureBaseSchema = {
  direction: directionSchema.optional(),
  durationMs: z.number().int().positive().optional(),
  percent: z.number().positive().max(1).optional(),
  from: pointSchema.optional(),
  to: pointSchema.optional()
};
