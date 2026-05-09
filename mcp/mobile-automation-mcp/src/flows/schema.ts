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

export const flowStepSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("tap"),
    selector: selectorSchema,
    timeoutMs: z.number().optional()
  }),
  z.object({
    action: z.literal("type"),
    selector: selectorSchema,
    text: z.string(),
    clearFirst: z.boolean().optional(),
    timeoutMs: z.number().optional()
  }),
  z.object({
    action: z.literal("assertText"),
    text: z.string(),
    timeoutMs: z.number().optional()
  }),
  z.object({
    action: z.literal("wait"),
    ms: z.number()
  }),
  z.object({
    action: z.literal("screenshot"),
    name: z.string().optional()
  }),
  z.object({
    action: z.literal("back")
  })
]);

export const mobileFlowSchema = z.object({
  name: z.string(),
  platform: z.enum(["ios", "android"]).optional(),
  runtime: z.enum(["rn", "android-native", "ios-native", "hybrid"]).optional(),
  steps: z.array(flowStepSchema)
});
