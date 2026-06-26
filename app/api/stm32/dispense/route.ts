import { NextResponse } from "next/server";
import { getStm32Config, stm32Dispense, stm32DispenseMany } from "@/utils/stm32";

export const runtime = "nodejs";

const IS_VERCEL = process.env.VERCEL === "1";

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

function getRqMotorNumber(code: string): number | undefined {
  const trimmed = code.trim();
  const rq = trimmed.match(/^RQ\s*(\d+)$/i);
  if (rq) {
    const n = Number(rq[1]);
    return Number.isFinite(n) ? n : undefined;
  }

  // In our app, cart/checkout often sends raw slot IDs like "14".
  // Treat numeric-only codes as motor numbers as well.
  const numeric = trimmed.match(/^(\d+)$/);
  if (numeric) {
    const n = Number(numeric[1]);
    return Number.isFinite(n) ? n : undefined;
  }

  return undefined;
}

function getMotorColumn(motorNum: number): number {
  return ((motorNum % 10) + 10) % 10;
}

function getMotorRow(motorNum: number): number {
  return Math.floor(motorNum / 10);
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

function removeSlotOffset(code: string, offset: number): string {
  if (!Number.isFinite(offset) || offset === 0) return code;
  const trimmed = code.trim();

  const rqMatch = trimmed.match(/^RQ\s*(\d+)$/i);
  if (rqMatch) {
    const n = Number(rqMatch[1]);
    if (!Number.isFinite(n)) return trimmed;
    return `RQ${n - offset}`;
  }

  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return trimmed;
    return String(n - offset);
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

    let sentCommands: string[] = [];

    if (normalized.length === 1) {
      const productCode = normalized[0];
      sentCommands = [productCode];
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
        sentCommands = [...sentCommands, "TRAY"];
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


      // Default batch size is 2 - dispense 2 products, then TRAY, then next 2
      const trayBatchSize = getEnvNumber("STM32_TRAY_BATCH_SIZE") ?? 2;

      const finalizeModeRaw = (getEnvString("STM32_FINALIZE_MODE") || "row").toLowerCase();

      // Check if any products share the same column (last digit of slot ID)
      const cols = normalized
        .map((c) => getRqMotorNumber(c))
        .filter((n): n is number => typeof n === "number")
        .map((n) => getMotorColumn(n));

      const seenCols = new Set<number>();
      let hasDuplicateColumn = false;
      for (const c of cols) {
        if (seenCols.has(c)) {
          hasDuplicateColumn = true;
          break;
        }
        seenCols.add(c);
      }

      let finalizeMode = finalizeModeRaw;
      if (finalizeModeRaw === "smart") {
        // smart mode: use 'each' if same column, otherwise 'once'
        finalizeMode = hasDuplicateColumn ? "each" : "once";
      } else if (finalizeModeRaw === "row") {
        // row mode: group by row, dispense all from same row together, then TRAY
        // For 6,7,8,16,26: row 0 (6,7,8) dispense together -> TRAY -> row 1 (16) -> TRAY -> row 2 (26) -> TRAY
        finalizeMode = "row";
      } else if (finalizeModeRaw === "each") {
        // each mode: always dispense one product, then TRAY
        finalizeMode = "each";
      }

      console.log("[STM32 Dispense] normalized:", normalized, "cols:", cols, "hasDuplicateColumn:", hasDuplicateColumn, "finalizeMode:", finalizeMode);

      const rqOkPattern = /Turning off motors/i;
      const rqErrorPattern = /^(500|501)$|No detection|Sensor already/i;
      const trayOkPattern = /^200$|Closing door|Waiting 5s for pickup/i;
      const trayErrorPattern = rqErrorPattern;

      const shouldBatchSingleSlot = (() => {
        if (!(trayBatchSize > 0)) return false;
        if (normalized.length <= Math.max(1, Math.floor(trayBatchSize))) return false;

        const motors = normalized
          .map((c) => getRqMotorNumber(c))
          .filter((n): n is number => typeof n === "number");

        if (motors.length !== normalized.length) return false;
        return new Set(motors).size === 1;
      })();

      if (shouldBatchSingleSlot) {
        const effectiveBatchSize = Math.max(1, Math.floor(trayBatchSize));
        const expanded: string[] = [];
        let batchCount = 0;

        for (let i = 0; i < normalized.length; i++) {
          const c = normalized[i];
          const trimmed = c.trim();
          const isRq = /^RQ\s*\d+$/i.test(trimmed);
          const isNumeric = /^\d+$/.test(trimmed);

          expanded.push(isRq ? trimmed : isNumeric ? `RQ${trimmed}` : trimmed);
          batchCount++;

          const isLast = i === normalized.length - 1;
          if (!isLast && batchCount >= effectiveBatchSize) {
            expanded.push("TRAY");
            batchCount = 0;
          }
        }

        // Always end at home for pickup.
        expanded.push("TRAY");

        sentCommands = expanded;

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
      } else if (finalizeMode === "row") {
        // Group products by row (first digit of slot ID), dispense all from one row, TRAY, then next row
        // Preserve original order within each row
        const motorNums = normalized.map((c, idx) => ({
          code: c,
          motor: getRqMotorNumber(c),
          originalIndex: idx,
        }));

        // Group by row, preserving original order
        const rowGroups = new Map<number, Array<{ code: string; originalIndex: number }>>();
        for (const { code, motor, originalIndex } of motorNums) {
          const row = motor !== undefined ? getMotorRow(motor) : 0;
          if (!rowGroups.has(row)) rowGroups.set(row, []);
          rowGroups.get(row)!.push({ code, originalIndex });
        }

        // Sort rows by the minimum original index in each row (preserves order of first appearance)
        const sortedRows = Array.from(rowGroups.keys()).sort((a, b) => {
          const minA = Math.min(...(rowGroups.get(a)?.map((x) => x.originalIndex) || [0]));
          const minB = Math.min(...(rowGroups.get(b)?.map((x) => x.originalIndex) || [0]));
          return minA - minB;
        });

        const expanded: string[] = [];
        for (const row of sortedRows) {
          const items = rowGroups.get(row) || [];
          // Sort items within row by original index
          items.sort((a, b) => a.originalIndex - b.originalIndex);
          for (const { code } of items) {
            const trimmed = code.trim();
            const isRq = /^RQ\s*\d+$/i.test(trimmed);
            const isNumeric = /^\d+$/.test(trimmed);
            expanded.push(isRq ? trimmed : isNumeric ? `RQ${trimmed}` : trimmed);
          }
          // TRAY after each row
          expanded.push("TRAY");
        }

        sentCommands = expanded;
        console.log("[STM32 Dispense] Row mode expanded commands:", expanded);

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
      } else if (finalizeMode === "each") {
        const expanded: string[] = [];
        for (const c of normalized) {
          const trimmed = c.trim();
          const isRq = /^RQ\s*\d+$/i.test(trimmed);
          const isNumeric = /^\d+$/.test(trimmed);
          expanded.push(isRq ? trimmed : isNumeric ? `RQ${trimmed}` : trimmed);
          expanded.push("TRAY");
        }

        sentCommands = expanded;

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
        sentCommands = [...normalized, "TRAY"];
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

    if (success && !IS_VERCEL) {
      try {
        const { adminDb } = await import("@/lib/admin-db");

        // Only decrement for actual product dispense commands; ignore TRAY.
        const slotCodes = sentCommands.filter((c) => String(c).trim().toUpperCase() !== "TRAY");

        // Decrement each code by 1 (or by the number of times it appears).
        const counts = new Map<number, number>();
        for (const code of slotCodes) {
          const originalCode = removeSlotOffset(String(code), slotOffset);
          const motor = getRqMotorNumber(originalCode);
          if (!motor) continue;
          counts.set(motor, (counts.get(motor) ?? 0) + 1);
        }

        counts.forEach((qty, slotId) => {
          adminDb.updateSlotQuantity(slotId, -qty);
          console.log(`[STM32] Decremented slot ${slotId} by ${qty} after successful dispense`);
        });
      } catch (e) {
        console.warn("[STM32] Dispense succeeded but failed to decrement slot inventory:", e);
      }
    }

    return NextResponse.json({
      success,
      data: {
        sentCommands,
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
