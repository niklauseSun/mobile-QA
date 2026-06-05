import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { UIMapRegistry } from "../core/registry.js";
import { validateSelectorExists } from "../core/validator.js";
import {
  PlatformInputSchema,
  UIActionInputSchema,
  toJsonContent
} from "./shared.js";

export const ValidateSelectorExistsInputSchema = z
  .object({
    semanticId: z.string().trim().min(1),
    platform: PlatformInputSchema,
    action: UIActionInputSchema.optional()
  })
  .strict();

export function registerValidateSelectorExistsTool(
  server: McpServer,
  registry: UIMapRegistry
) {
  server.tool(
    "ui.validate_selector_exists",
    "Validate that a semanticId has a selector for a platform and optional action.",
    ValidateSelectorExistsInputSchema.shape,
    async (input) => {
      const parsed = ValidateSelectorExistsInputSchema.parse(input);

      return toJsonContent(validateSelectorExists(registry, parsed));
    }
  );
}
