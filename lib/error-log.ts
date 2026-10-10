import fs from "fs";
import path from "path";

const MAX_LINE_CHARS = 8_000;
const LOG_DIR = path.join(process.cwd(), "logs");

function todayStamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function logFilePath(): string {
  return path.join(LOG_DIR, `error-${todayStamp()}.log`);
}

function redact(text: string): string {
  return text
    .replace(/(authorization|api[_-]?key|secret|password|token)\s*[:=]\s*["']?[^"'\s]+/gi, "$1=[redacted]")
    .slice(0, MAX_LINE_CHARS);
}

function formatArg(value: unknown): string {
  if (value instanceof Error) {
    return value.stack || `${value.name}: ${value.message}`;
  }
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function appendErrorLog(
  level: "error" | "warn",
  message: string,
  extra?: Record<string, unknown>
): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      message: redact(message),
      ...(extra && Object.keys(extra).length ? { extra } : {}),
    });
    fs.appendFileSync(logFilePath(), `${line}\n`, "utf8");
  } catch {
    // Never throw from logging.
  }
}

let hooked = false;

/** Capture console.error + process crashes into logs/error-YYYY-MM-DD.log */
export function initErrorLog(): void {
  if (hooked || typeof process === "undefined") return;
  hooked = true;

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalError(...args);
    appendErrorLog("error", args.map(formatArg).join(" "));
  };

  process.on("uncaughtException", (err) => {
    appendErrorLog("error", `uncaughtException: ${formatArg(err)}`);
  });
  process.on("unhandledRejection", (reason) => {
    appendErrorLog("error", `unhandledRejection: ${formatArg(reason)}`);
  });
}

export { logFilePath, LOG_DIR };
