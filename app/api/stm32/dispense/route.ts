import { NextResponse } from "next/server";
import { getStm32Config, stm32Dispense, stm32DispenseMany } from "@/utils/stm32";

export const runtime = "nodejs";

function getEnvNumber(name: string): number | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function getEnvString(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function getEnvBoolean(name: string): boolean {
  const v = getEnvString(name);
  if (!v) return false;
  const n = v.toLowerCase();
  return n === "1" || n === "true" || n === "yes";
}

function applySlotOffset(code: string, offset: number): string {
  if (!Number.isFinite(offset) || offset === 0) return code;
  const trimmed = code.trim();

  const rqMatch = trimmed.match(/^RQ\s*(\d+)$/i);
  if (rqMatch) {
    const n = Number(rqMatch[1]);
    if (!Number.isFinite(n)) return trimmed;
    return `RQ${n + offset}`;
  }

  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return trimmed;
    return String(n + offset);
  }

  return trimmed;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          productCode?: string;
          productCodes?: string[];
        }
      | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid JSON body" } },
        { status: 400 }
      );
    }

    const cfg = getStm32Config();

    const codes: string[] = Array.isArray(body.productCodes)
      ? body.productCodes
      : typeof body.productCode === "string"
        ? [body.productCode]
        : [];

    const slotOffset = getEnvNumber("STM32_SLOT_ID_OFFSET") ?? 0;

    const normalized = codes
      .map((c) => (typeof c === "string" ? applySlotOffset(c, slotOffset) : ""))
      .filter((c) => c.length > 0);

    if (normalized.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "Missing productCode(s)" } },
        { status: 400 }
      );
    }

    const results: Array<{
      productCode: string;
      ok: boolean;
      okLine?: string;
      errorLine?: string;
      rawLines: string[];
    }> = [];

    if (normalized.length === 1) {
      const productCode = normalized[0];
      const res = await stm32Dispense(cfg, productCode, {
        okPattern: /Turning off motors/i,
        errorPattern: /^(500|501)$|No detection|Sensor already/i,
      });
      results.push({
        productCode,
        ok: Boolean(res.okLine) && !res.errorLine,
        okLine: res.okLine,
        errorLine: res.errorLine,
        rawLines: res.rawLines,
      });

      const shouldAutoTray = getEnvBoolean("STM32_AUTO_TRAY_AFTER_SINGLE");
      if (shouldAutoTray && Boolean(res.okLine) && !res.errorLine) {
        const trayRes = await stm32Dispense(cfg, "TRAY", {
          commandPrefix: "",
          okPattern: /^200$|Closing door|Waiting 5s for pickup/i,
          errorPattern: /^(500|501)$|No detection|Sensor already/i,
        });
        results.push({
          productCode: "TRAY",
          ok: Boolean(trayRes.okLine) && !trayRes.errorLine,
          okLine: trayRes.okLine,
          errorLine: trayRes.errorLine,
          rawLines: trayRes.rawLines,
        });
      }
    } else {
      const delayBetweenCommandsMs = getEnvNumber("STM32_DELAY_BETWEEN_COMMANDS_MS") ?? 0;
      const delayBeforeFinalizeMs = getEnvNumber("STM32_DELAY_BEFORE_FINALIZE_MS") ?? 0;

      const finalizeMode = (getEnvString("STM32_FINALIZE_MODE") || "once").toLowerCase();

      const rqOkPattern = /Turning off motors/i;
      const rqErrorPattern = /^(500|501)$|No detection|Sensor already/i;
      const trayOkPattern = /^200$|Closing door|Waiting 5s for pickup/i;
      const trayErrorPattern = rqErrorPattern;

      if (finalizeMode === "each") {
        const expanded: string[] = [];
        for (const c of normalized) {
          expanded.push(c);
          expanded.push("TRAY");
        }

        const batch = await stm32DispenseMany(cfg, expanded, {
          commandPrefix: "",
          okPattern: /Turning off motors|^200$|Closing door|Waiting 5s for pickup/i,
          errorPattern: /^(500|501)$|No detection|Sensor already/i,
          delayBetweenCommandsMs,
        });

        for (const { productCode, result: res } of batch) {
          results.push({
            productCode,
            ok: Boolean(res.okLine) && !res.errorLine,
            okLine: res.okLine,
            errorLine: res.errorLine,
            rawLines: res.rawLines,
          });
        }
      } else {
        const batch = await stm32DispenseMany(cfg, normalized, {
          finalizeCommand: "TRAY",
          okPattern: rqOkPattern,
          errorPattern: rqErrorPattern,
          finalizeOkPattern: trayOkPattern,
          finalizeErrorPattern: trayErrorPattern,
          delayBetweenCommandsMs,
          delayBeforeFinalizeMs,
        });
        for (const { productCode, result: res } of batch) {
          results.push({
            productCode,
            ok: Boolean(res.okLine) && !res.errorLine,
            okLine: res.okLine,
            errorLine: res.errorLine,
            rawLines: res.rawLines,
          });
        }
      }
    }

    const success = results.every((r) => r.ok);

    return NextResponse.json({
      success,
      data: {
        results,
      },
    });
  } catch (err: any) {
    const message =
      typeof err?.message === "string" && err.message.trim().length > 0
        ? err.message
        : "Failed to dispense";

    const statusCode = message.startsWith("Missing env") || message.startsWith("Invalid env") ? 500 : 500;

    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "production"
            ? { message }
            : {
                message,
                raw: {
                  name: err?.name,
                  stack: err?.stack,
                },
              },
      },
      { status: statusCode }
    );
  }
}
