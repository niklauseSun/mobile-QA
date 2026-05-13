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

const directionSchema = z.enum(["up", "down", "left", "right"]);

const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite()
});

const gestureBaseSchema = {
  direction: directionSchema.optional(),
  durationMs: z.number().int().positive().optional(),
  percent: z.number().positive().max(1).optional(),
  from: pointSchema.optional(),
  to: pointSchema.optional()
};

const longPressSchema = z
  .object({
    action: z.literal("longPress"),
    selector: selectorSchema.optional(),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    durationMs: z.number().int().positive().optional(),
    timeoutMs: z.number().int().positive().optional()
  })
  .superRefine((value, ctx) => {
    if (value.selector || (value.x !== undefined && value.y !== undefined)) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "longPress requires either selector or both x and y"
    });
  });

const swipeSchema = z
  .object({
    action: z.literal("swipe"),
    ...gestureBaseSchema
  })
  .superRefine(requireCompleteSwipeCoordinates);

const scrollSchema = z
  .object({
    action: z.literal("scroll"),
    ...gestureBaseSchema,
    selector: selectorSchema.optional(),
    scrollableSelector: selectorSchema.optional(),
    maxScrolls: z.number().int().positive().optional(),
    timeoutMs: z.number().int().positive().optional()
  })
  .superRefine(requireCompleteSwipeCoordinates);

export const flowStepSchema = z.union([
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
  }),
  swipeSchema,
  scrollSchema,
  longPressSchema,
  z.object({
    action: z.literal("hideKeyboard"),
    keys: z.array(z.string()).optional()
  }),
  z.object({
    action: z.literal("deepLink"),
    url: z.string().min(1),
    appIdentifier: z.string().min(1),
    waitForLaunch: z.boolean().optional()
  })
]);

export const mobileFlowSchema = z.object({
  name: z.string(),
  platform: z.enum(["ios", "android"]).optional(),
  runtime: z.enum(["rn", "android-native", "ios-native", "hybrid"]).optional(),
  steps: z.array(flowStepSchema)
});

function requireCompleteSwipeCoordinates(
  value: { from?: unknown; to?: unknown },
  ctx: z.RefinementCtx
) {
  if ((value.from && !value.to) || (!value.from && value.to)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "swipe coordinates require both from and to"
    });
  }
}
