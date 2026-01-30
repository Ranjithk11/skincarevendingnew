import { NextRequest, NextResponse } from "next/server";

// POST motor control command
// In a real implementation, this would communicate with hardware
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

    // Parse command (format: "M,slotId,action" where action is 0=test, 1=dispense)
    const parts = command.split(",");
    
    if (parts[0] === "M" && parts.length >= 3) {
      const slotId = parts[1];
      const action = parts[2] === "1" ? "dispense" : "test";
      
      // Simulate motor response
      console.log(`Motor command: ${action} for slot ${slotId}`);
      
      return NextResponse.json({
        success: true,
        message: `Motor ${action} command sent for slot ${slotId}`,
        response: `200 OK - ${action.toUpperCase()} completed`,
      });
    }

    // Handle other commands like HOME, DISPENSE
    if (command === "HOME") {
      return NextResponse.json({
        success: true,
        message: "Home command sent",
        response: "200 OK - Machine homed",
      });
    }

    if (command === "DISPENSE") {
      return NextResponse.json({
        success: true,
        message: "Dispense command sent",
        response: "200 OK - Dispense completed",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Command '${command}' processed`,
      response: "200 OK",
    });
  } catch (error) {
    console.error("Motor control error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send motor command" },
      { status: 500 }
    );
  }
}
