import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { UIMapSchema } from "./schema.js";
import { UIMapRegistry } from "./registry.js";
import type { UIMap } from "./types.js";

export async function loadUIMapRegistry(directory: string): Promise<UIMapRegistry> {
  const uiMaps = await loadUIMaps(directory);
  return new UIMapRegistry(uiMaps);
}

export async function loadUIMaps(directory: string): Promise<UIMap[]> {
  const filePaths = await findUIMapFiles(directory);
  const uiMaps: UIMap[] = [];

  for (const filePath of filePaths) {
    uiMaps.push(await loadUIMapFile(filePath));
  }

  return uiMaps;
}

async function findUIMapFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ui-map.json"))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function loadUIMapFile(filePath: string): Promise<UIMap> {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to read UI Map file ${filePath}: ${toMessage(error)}`);
  }

  const parseResult = UIMapSchema.safeParse(parsedJson);

  if (!parseResult.success) {
    throw new Error(
      `Invalid UI Map file ${filePath}: ${parseResult.error.message}`
    );
  }

  return parseResult.data;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
