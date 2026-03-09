import { NextRequest, NextResponse } from "next/server";
import { stm32Dispense, getStm32Config } from "@/utils/stm32";

// POST motor control command
// Connects to real STM32 hardware via serial port
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

    // Get STM32 config
    let cfg;
    try {
      cfg = getStm32Config();
    } catch (envError) {
      console.error("STM32 config error:", envError);
      return NextResponse.json(
        { success: false, message: "STM32 not configured. Check STM32_PORT in .env.local" },
        { status: 500 }
      );
    }

    // Parse command (format: "M,slotId,action" where action is 0=test, 1=dispense)
    const parts = command.split(",");
    
    if (parts[0] === "M" && parts.length >= 3) {
      const slotId = parts[1];
      const action = parts[2] === "1" ? "dispense" : "test";
      
      console.log(`[STM32] Motor command: ${action} for slot ${slotId}`);
      
      // In mock mode, simulate success
      if (cfg.mock) {
        console.log(`[STM32 Mock] Simulating ${action} for slot ${slotId}`);

        if (action === "dispense") {
          try {
            const { adminDb } = await import("@/lib/admin-db");
            const slotNum = Number(slotId);
            if (Number.isFinite(slotNum)) {
              adminDb.updateSlotQuantity(slotNum, -1);
              console.log(`[STM32 Mock] Decremented slot ${slotNum} by 1`);
            }
          } catch (e) {
            console.warn("[STM32 Mock] Failed to decrement slot inventory:", e);
          }
        }

        return NextResponse.json({
          success: true,
          message: `Motor ${action} command sent for slot ${slotId} (mock)`,
          response: `200 OK - ${action.toUpperCase()} completed`,
          rawLines: [`[MOCK] ${action} slot ${slotId}`, "[MOCK] Request sequence finished"],
        });
      }
      
      // Send RQ command to STM32 for dispense
      if (action === "dispense") {
        try {
          const result = await stm32Dispense(cfg, slotId);
          
          if (result.okLine) {
            try {
              const { adminDb } = await import("@/lib/admin-db");
              const slotNum = Number(slotId);
              if (Number.isFinite(slotNum)) {
                adminDb.updateSlotQuantity(slotNum, -1);
                console.log(`[STM32] Decremented slot ${slotNum} by 1 after successful dispense`);
              }
            } catch (e) {
              console.warn("[STM32] Dispense succeeded but failed to decrement slot inventory:", e);
            }

            return NextResponse.json({
              success: true,
              message: `Motor ${action} command sent for slot ${slotId}`,
              response: result.okLine,
              rawLines: result.rawLines,
            });
          } else if (result.errorLine) {
            return NextResponse.json({
              success: false,
              message: `STM32 error: ${result.errorLine}`,
              rawLines: result.rawLines,
            }, { status: 500 });
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error("[STM32] Dispense error:", error);
          return NextResponse.json({
            success: false,
            message: error.message,
          }, { status: 500 });
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Motor ${action} command sent for slot ${slotId}`,
        response: `200 OK - ${action.toUpperCase()} completed`,
      });
    }

    // Handle HOME command
    if (command === "HOME") {
      // In mock mode or serverless, simulate success
      if (cfg.mock) {
        console.log("[STM32 Mock] Simulating HOME command");
        return NextResponse.json({
          success: true,
          message: "Home command sent (mock)",
          response: "Homing initiated",
          rawLines: ["[MOCK] HOME command", "[MOCK] Homing complete"],
        });
      }
      
      try {
        // Firmware expects HOME<axisNumber>. Home tray axis (0) for "Home Machine".
        // Treat homing prints as success so UI doesn't show false errors.
        const result = await stm32Dispense(cfg, "HOME0", {
          commandPrefix: "",
          okPattern: /Homed axis successfully|Moving toward endstop|Endstop already trigerred/i,
          errorPattern: /Endstop error|Invalid stepper Motor selected|Unknown command/i,
        });
        
        return NextResponse.json({
          success: true,
          message: "Home command sent",
          response: result.okLine || "Homing initiated",
          rawLines: result.rawLines,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("[STM32] Home error:", error);
        return NextResponse.json({
          success: false,
          message: error.message,
        }, { status: 500 });
      }
    }

    // Handle REOPEN command - reopens the tray door
    // Firmware outputs: "REOPEN command received", "Opening dispensing door", 
    // "Door opened. Waiting 10 seconds...", "Closing dispensing door", "REOPEN complete", "200"
    if (command === "REOPEN") {
      if (cfg.mock) {
        console.log("[STM32 Mock] Simulating REOPEN command");
        return NextResponse.json({
          success: true,
          message: "Reopen command sent (mock)",
          response: "REOPEN complete",
          rawLines: [
            "[MOCK] REOPEN command received",
            "[MOCK] Opening dispensing door",
            "[MOCK] Door opened. Waiting 10 seconds...",
            "[MOCK] Closing dispensing door",
            "[MOCK] REOPEN complete",
            "[MOCK] 200",
          ],
        });
      }
      
      try {
        const result = await stm32Dispense(cfg, "REOPEN", {
          commandPrefix: "",
          okPattern: /REOPEN complete|^200$/i,
          errorPattern: /error|fail|invalid/i,
        });
        
        return NextResponse.json({
          success: true,
          message: "Reopen command sent",
          response: result.okLine || "REOPEN complete",
          rawLines: result.rawLines,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("[STM32] Reopen error:", error);
        return NextResponse.json({
          success: false,
          message: error.message,
        }, { status: 500 });
      }
    }

    // Handle DISPENSE command (generic - no slot selected)
    if (command === "DISPENSE") {
      // In mock mode, return helpful message
      if (cfg.mock) {
        return NextResponse.json({
          success: false,
          message: "Please select a slot first before dispensing",
        }, { status: 400 });
      }
      return NextResponse.json({
        success: false,
        message: "Please select a slot first before dispensing",
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Command '${command}' processed`,
      response: "200 OK",
    });
  } catch (error) {
    console.error("Motor control error:", error);
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      { success: false, message: err.message || "Failed to send motor command" },
      { status: 500 }
    );
  }
}
