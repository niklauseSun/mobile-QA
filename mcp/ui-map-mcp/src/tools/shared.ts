import { PlatformSchema, UIActionSchema } from "../core/schema.js";
import type { Platform, UIElement } from "../core/types.js";

export const PlatformInputSchema = PlatformSchema;
export const UIActionInputSchema = UIActionSchema;

export function toJsonContent(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

export function formatElement(
  screen: string,
  key: string,
  element: UIElement,
  platform?: Platform
): Record<string, unknown> {
  return {
    screen,
    key,
    semanticId: element.semanticId,
    description: element.description,
    type: element.type,
    aliases: element.aliases ?? [],
    actions: element.actions,
    required: element.required ?? false,
    selector: platform === undefined ? undefined : element.platform[platform]
  };
}
