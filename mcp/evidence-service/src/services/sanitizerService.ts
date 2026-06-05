const SECRET_KEY_PATTERN =
  /(password|passwd|pwd|secret|token|access[_-]?token|refresh[_-]?token|authorization|api[_-]?key|session|cookie)/i;

const REDACTED = "[REDACTED]";

export class SanitizerService {
  sanitizeJson<T>(value: T): T {
    return this.sanitizeValue(value, 0) as T;
  }

  sanitizeText(content: string): string {
    return content
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
      .replace(
        /((?:password|passwd|pwd|secret|token|access[_-]?token|refresh[_-]?token|api[_-]?key)\s*[=:]\s*)([^\s"'&<>]+)/gi,
        `$1${REDACTED}`
      )
      .replace(
        /((?:authorization|cookie)\s*[:=]\s*)([^\r\n]+)/gi,
        `$1${REDACTED}`
      )
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
      .replace(/\b(?:\+?\d[\d -]{8,}\d)\b/g, "[REDACTED_PHONE]");
  }

  private sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > 20) {
      return "[REDACTED_DEPTH_LIMIT]";
    }

    if (typeof value === "string") {
      return this.sanitizeText(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item, depth + 1));
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    const output: Record<string, unknown> = {};

    for (const [key, childValue] of Object.entries(value)) {
      output[key] = SECRET_KEY_PATTERN.test(key)
        ? REDACTED
        : this.sanitizeValue(childValue, depth + 1);
    }

    return output;
  }
}
