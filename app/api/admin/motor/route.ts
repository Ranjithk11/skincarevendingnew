import { NextRequest, NextResponse } from "next/server";
import { stm32Dispense, getStm32Config, type Stm32Config } from "@/utils/stm32";
import {
  FIRMWARE_COMMANDS,
  FIRMWARE_PATTERNS,
  toFirmwareMotorNumber,
} from "@/utils/stm32Firmware";

// POST motor control command — protocol matches productDispenserV8 .ino on the NUC
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command } = body;

    if (!command) {
      return NextResponse.json(
        { success: false, message: "Command is required" },
        { status: 400 }
      );
    }

    let cfg: Stm32Config;
    try {
      cfg = getStm32Config();
    } catch (envError) {
      console.error("STM32 config error:", envError);
      return NextResponse.json(
        { success: false, message: "STM32 not configured. Check STM32_PORT in .env.local" },
        { status: 500 }
      );
    }

    const runCommand = async (
      firmwareCommand: string,
      patterns: { ok: RegExp; error: RegExp; timeoutMs: number },
      commandPrefix = ""
    ) => {
      if (cfg.mock) {
        return {
          success: true,
          message: `${firmwareCommand} sent (mock)`,
          response: "200",
          rawLines: [`[MOCK] ${firmwareCommand}`],
        };
      }

      const result = await stm32Dispense(cfg, firmwareCommand, {
        commandPrefix,
        okPattern: patterns.ok,
        errorPattern: patterns.error,
        timeoutMs: patterns.timeoutMs,
      });

      if (result.errorLine) {
        return {
          success: false,
          message: result.errorLine,
          rawLines: result.rawLines,
        };
      }

      if (!result.okLine) {
        return {
          success: false,
          message: "STM32 response timeout — check endstops / serial connection",
          rawLines: result.rawLines,
        };
      }

      return {
        success: true,
        message: `${firmwareCommand} OK`,
        response: result.okLine,
        rawLines: result.rawLines,
      };
    };

    // Admin format: M,{uiSlot},{0=test|1=dispense} → firmware M{n} or RQ{n}
    const parts = String(command).split(",");

    if (parts[0] === "M" && parts.length >= 3) {
      const uiSlot = parts[1];
      const action = parts[2];
      const motorNum = toFirmwareMotorNumber(uiSlot);

      if (action === "1") {
        const outcome = await runCommand(
          motorNum,
          FIRMWARE_PATTERNS.dispense
        );

        if (outcome.success) {
          try {
            const { adminDb } = await import("@/lib/admin-db");
            const slotNum = Number(uiSlot);
            if (Number.isFinite(slotNum)) {
              adminDb.updateSlotQuantity(slotNum, -1);
            }
          } catch (e) {
            console.warn("[STM32] Failed to decrement slot inventory:", e);
          }
        }

        return NextResponse.json(outcome, { status: outcome.success ? 200 : 500 });
      }

      if (action === "0") {
        const outcome = await runCommand(
          `M${motorNum}`,
          FIRMWARE_PATTERNS.testMotor,
          ""
        );
        return NextResponse.json(outcome, { status: outcome.success ? 200 : 500 });
      }
    }

    if (command === "HOME" || command === FIRMWARE_COMMANDS.homeTray) {
      const outcome = await runCommand(
        FIRMWARE_COMMANDS.homeTray,
        FIRMWARE_PATTERNS.home,
        ""
      );
      return NextResponse.json(outcome, { status: outcome.success ? 200 : 500 });
    }

    if (command === "TRAY" || command === FIRMWARE_COMMANDS.tray) {
      const outcome = await runCommand(
        FIRMWARE_COMMANDS.tray,
        FIRMWARE_PATTERNS.tray,
        ""
      );
      return NextResponse.json(outcome, { status: outcome.success ? 200 : 500 });
    }

    if (command === "REOPEN" || command === FIRMWARE_COMMANDS.reopen) {
      const outcome = await runCommand(
        FIRMWARE_COMMANDS.reopen,
        FIRMWARE_PATTERNS.reopen,
        ""
      );
      return NextResponse.json(outcome, { status: outcome.success ? 200 : 500 });
    }

    if (command === "DISPENSE") {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a slot on the grid first, then click Dispense",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: `Unknown command: ${command}. Use HOME, TRAY, REOPEN, or M,{slot},{0|1}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Motor control error:", error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      { success: false, message: err.message || "Failed to send motor command" },
      { status: 500 }
    );
  }
}
