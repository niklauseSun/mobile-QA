import fs from "node:fs/promises";
import path from "node:path";

export interface DeviceLogEntry {
  timestamp?: number | string;
  level?: string;
  message: string;
}

export interface FormatDeviceLogsOptions {
  filter?: string;
  maxEntries?: number;
  sinceTimestamp?: number;
  redact?: boolean;
}

export interface DeviceLogResult {
  type: string;
  count: number;
  totalCount: number;
  truncated: boolean;
  redacted: boolean;
  entries: DeviceLogEntry[];
}

export interface ReadAppiumLogOptions {
  filter?: string;
  maxLines?: number;
  maxBytes?: number;
  redact?: boolean;
}

export interface AppiumLogResult {
  path: string;
  lineCount: number;
  totalLineCount: number;
  truncatedBytes: number;
  redacted: boolean;
  lines: string[];
}

const DEFAULT_MAX_ENTRIES = 200;
const DEFAULT_MAX_LINES = 200;
const DEFAULT_MAX_BYTES = 256 * 1024;

export function formatDeviceLogs(
  type: string,
  logs: unknown[],
  options: FormatDeviceLogsOptions = {}
): DeviceLogResult {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const redact = options.redact ?? true;
  const normalized = logs.map((log) => normalizeLogEntry(log, redact));
  const filtered = normalized.filter((entry) => {
    if (
      options.sinceTimestamp !== undefined &&
      typeof entry.timestamp === "number" &&
      entry.timestamp < options.sinceTimestamp
    ) {
      return false;
    }

    return matchesFilter(entry.message, options.filter);
  });
  const entries = filtered.slice(-maxEntries);

  return {
    type,
    count: entries.length,
    totalCount: normalized.length,
    truncated: filtered.length > entries.length,
    redacted: redact,
    entries
  };
}

export async function readAppiumLogFile(
  filePath: string,
  options: ReadAppiumLogOptions = {}
): Promise<AppiumLogResult> {
  const absolutePath = path.resolve(filePath);
  const stat = await fs.lstat(absolutePath);
  const extension = path.extname(absolutePath).toLowerCase();

  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`Appium log path is not a regular file: ${absolutePath}`);
  }

  if (extension !== ".log" && extension !== ".txt") {
    throw new Error("Appium log path must end with .log or .txt.");
  }

  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
  const start = Math.max(0, stat.size - maxBytes);
  const handle = await fs.open(absolutePath, "r");

  try {
    const length = stat.size - start;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    const text = buffer.toString("utf-8");
    const lines = text
      .split(/\r?\n/)
      .filter((line, index, allLines) => line !== "" || index < allLines.length - 1)
      .filter((line) => matchesFilter(line, options.filter))
      .map((line) => (options.redact ?? true ? redactLogText(line) : line));
    const tailLines = lines.slice(-maxLines);

    return {
      path: absolutePath,
      lineCount: tailLines.length,
      totalLineCount: lines.length,
      truncatedBytes: start,
      redacted: options.redact ?? true,
      lines: tailLines
    };
  } finally {
    await handle.close();
  }
}

export function redactLogText(text: string): string {
  return text
    .replace(/(authorization\s*:\s*)bearer\s+[^\s,;]+/gi, "$1<redacted>")
    .replace(
      /(["']?(?:password|passwd|pwd|token|access_token|refresh_token|api[_-]?key|secret)["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&]+)/gi,
      (_match, prefix: string, value: string) => {
        if (value.startsWith("\"")) {
          return `${prefix}"<redacted>"`;
        }

        if (value.startsWith("'")) {
          return `${prefix}'<redacted>'`;
        }

        return `${prefix}<redacted>`;
      }
    );
}

function normalizeLogEntry(log: unknown, redact: boolean): DeviceLogEntry {
  if (typeof log === "string") {
    return {
      message: redact ? redactLogText(log) : log
    };
  }

  if (!log || typeof log !== "object") {
    return {
      message: redact ? redactLogText(String(log)) : String(log)
    };
  }

  const record = log as Record<string, unknown>;
  const message =
    stringValue(record.message) ??
    stringValue(record.msg) ??
    stringValue(record.text) ??
    JSON.stringify(record);

  return stripUndefined({
    timestamp: normalizeTimestamp(record.timestamp ?? record.time),
    level: stringValue(record.level),
    message: redact ? redactLogText(message) : message
  });
}

function normalizeTimestamp(value: unknown): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }

  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function matchesFilter(value: string, filter: string | undefined) {
  if (!filter) {
    return true;
  }

  return value.toLowerCase().includes(filter.toLowerCase());
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      delete value[key];
    }
  }

  return value;
}
