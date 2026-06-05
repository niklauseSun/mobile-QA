import { extname } from "node:path";

export function safeFileName(value: string, fallback = "artifact"): string {
  const extension = extname(value);
  const base = extension ? value.slice(0, -extension.length) : value;
  const safeBase = toAsciiSlug(base);
  const safeExtension = extension ? toAsciiSlug(extension.slice(1)) : "";
  const normalizedBase = safeBase || fallback;

  return safeExtension ? `${normalizedBase}.${safeExtension}` : normalizedBase;
}

export function safePathSegment(value: string, fallback = "item"): string {
  return toAsciiSlug(value) || fallback;
}

export function withIndex(index: number, name: string, extension: string): string {
  const paddedIndex = String(index).padStart(3, "0");
  const safeName = safePathSegment(name, "step");
  const safeExtension = extension.replace(/^\./, "");

  return `${paddedIndex}-${safeName}.${safeExtension}`;
}

function toAsciiSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 120)
    .toLowerCase();
}
