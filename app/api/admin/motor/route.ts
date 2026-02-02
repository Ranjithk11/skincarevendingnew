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
        // Send HOME command to STM32 - use "00" as a placeholder code with HOME prefix
        const result = await stm32Dispense(cfg, "00", { commandPrefix: "HOME" });
        
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

    // Handle DISPENSE command (generic)
    if (command === "DISPENSE") {
      return NextResponse.json({
        success: false,
        message: "Please specify a slot number using M,slotId,1 format",
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
