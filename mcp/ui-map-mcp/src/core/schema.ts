import { z } from "zod";

export const PlatformSchema = z.enum(["ios", "android", "web"]);

export const UIElementTypeSchema = z.enum([
  "input",
  "button",
  "text",
  "cell",
  "image",
  "tab",
  "switch",
  "checkbox"
]);

export const UIActionSchema = z.enum([
  "tap",
  "input",
  "clear",
  "focus",
  "swipe",
  "assertVisible",
  "assertText",
  "longPress"
]);

export const SelectorTypeSchema = z.enum([
  "accessibilityId",
  "resourceId",
  "xpath",
  "text",
  "data-testid",
  "css"
]);

export const SemanticIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/, {
    message: "semanticId must follow ScreenName.elementName format"
  });

export const PlatformSelectorSchema = z
  .object({
    selectorType: SelectorTypeSchema,
    selector: z.string().trim().min(1, "selector cannot be empty")
  })
  .strict();

export const UIElementSchema = z
  .object({
    semanticId: SemanticIdSchema,
    description: z.string().trim().min(1),
    type: UIElementTypeSchema,
    aliases: z.array(z.string().trim().min(1)).optional(),
    actions: z.array(UIActionSchema).min(1, "actions must not be empty"),
    required: z.boolean().optional(),
    platform: z
      .object({
        ios: PlatformSelectorSchema.optional(),
        android: PlatformSelectorSchema.optional(),
        web: PlatformSelectorSchema.optional()
      })
      .strict()
  })
  .strict();

export const UIScreenSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    route: z.string().trim().min(1).optional(),
    elements: z.record(z.string().trim().min(1), UIElementSchema)
  })
  .strict();

export const UIMapSchema = z
  .object({
    screens: z.record(z.string().trim().min(1), UIScreenSchema)
  })
  .strict()
  .superRefine((uiMap, context) => {
    for (const [screenKey, screen] of Object.entries(uiMap.screens)) {
      for (const [elementKey, element] of Object.entries(screen.elements)) {
        const [semanticScreenName] = element.semanticId.split(".");
        const validScreenNames = new Set([
          normalizeScreenName(screenKey),
          normalizeScreenName(screen.name)
        ]);

        if (!validScreenNames.has(normalizeScreenName(semanticScreenName))) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["screens", screenKey, "elements", elementKey, "semanticId"],
            message: "screen name in semanticId must match parent screen"
          });
        }
      }
    }
  });

export type PlatformInput = z.infer<typeof PlatformSchema>;
export type UIElementTypeInput = z.infer<typeof UIElementTypeSchema>;
export type UIActionInput = z.infer<typeof UIActionSchema>;
export type SelectorTypeInput = z.infer<typeof SelectorTypeSchema>;
export type PlatformSelectorInput = z.infer<typeof PlatformSelectorSchema>;
export type UIElementInput = z.infer<typeof UIElementSchema>;
export type UIScreenInput = z.infer<typeof UIScreenSchema>;
export type UIMapInput = z.infer<typeof UIMapSchema>;

function normalizeScreenName(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}
