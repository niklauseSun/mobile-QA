import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, normalize, relative, resolve, sep } from "node:path";

import type { ArtifactDirectory } from "../models/artifact.js";
import type { ArtifactStorage } from "../services/artifactStorage.js";

export class LocalArtifactStorage implements ArtifactStorage {
  private readonly rootDir: string;

  constructor(rootDir = process.env.ARTIFACT_ROOT ?? join(process.cwd(), "artifacts/runs")) {
    this.rootDir = resolve(rootDir);
  }

  getRunRoot(runId: string): string {
    return this.resolveRunRoot(runId);
  }

  async ensureRun(runId: string, directories: ArtifactDirectory[]): Promise<string> {
    const runRoot = this.resolveRunRoot(runId);
    await mkdir(runRoot, { recursive: true });

    for (const directory of directories) {
      await mkdir(this.resolvePath(runId, directory), { recursive: true });
    }

    return runRoot;
  }

  async writeJson(runId: string, relativePath: string, data: unknown): Promise<string> {
    return this.writeText(runId, relativePath, `${JSON.stringify(data, null, 2)}\n`);
  }

  async readJson<T>(runId: string, relativePath: string): Promise<T | undefined> {
    const content = await this.readText(runId, relativePath);

    if (content === undefined) {
      return undefined;
    }

    return JSON.parse(content) as T;
  }

  async writeText(runId: string, relativePath: string, content: string): Promise<string> {
    const targetPath = this.resolvePath(runId, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });

    const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, content, "utf8");
    await rename(tempPath, targetPath);
    return this.toRunRelative(runId, targetPath);
  }

  async readText(runId: string, relativePath: string): Promise<string | undefined> {
    try {
      return await readFile(this.resolvePath(runId, relativePath), "utf8");
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }

      throw error;
    }
  }

  async writeBuffer(runId: string, relativePath: string, content: Buffer): Promise<string> {
    const targetPath = this.resolvePath(runId, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });

    const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, content);
    await rename(tempPath, targetPath);
    return this.toRunRelative(runId, targetPath);
  }

  async exists(runId: string, relativePath: string): Promise<boolean> {
    try {
      await stat(this.resolvePath(runId, relativePath));
      return true;
    } catch (error) {
      if (isNotFound(error)) {
        return false;
      }

      throw error;
    }
  }

  async listFiles(runId: string, relativeDirectory = "."): Promise<string[]> {
    const directory = this.resolvePath(runId, relativeDirectory);
    const files: string[] = [];

    await this.collectFiles(runId, directory, files);
    return files.sort();
  }

  private async collectFiles(runId: string, directory: string, files: string[]): Promise<void> {
    let entries;

    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (isNotFound(error)) {
        return;
      }

      throw error;
    }

    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        await this.collectFiles(runId, absolutePath, files);
      } else if (entry.isFile()) {
        files.push(this.toRunRelative(runId, absolutePath));
      }
    }
  }

  private resolveRunRoot(runId: string): string {
    assertSafeSegment(runId, "runId");
    return join(this.rootDir, runId);
  }

  private resolvePath(runId: string, relativePath: string): string {
    const runRoot = this.resolveRunRoot(runId);
    const normalizedPath = normalize(relativePath);

    if (normalizedPath.startsWith("..") || normalizedPath.includes(`${sep}..${sep}`)) {
      throw new Error(`Unsafe artifact path: ${relativePath}`);
    }

    const absolutePath = resolve(runRoot, normalizedPath);
    const relativeToRunRoot = relative(runRoot, absolutePath);

    if (relativeToRunRoot.startsWith("..") || relativeToRunRoot === "") {
      if (relativeToRunRoot === "") {
        return absolutePath;
      }

      throw new Error(`Artifact path escaped run root: ${relativePath}`);
    }

    return absolutePath;
  }

  private toRunRelative(runId: string, absolutePath: string): string {
    return relative(this.resolveRunRoot(runId), absolutePath).split(sep).join("/");
  }
}

function assertSafeSegment(value: string, label: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
