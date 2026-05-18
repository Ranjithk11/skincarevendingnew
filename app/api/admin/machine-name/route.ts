import { NextRequest, NextResponse } from "next/server";

// GET - Get all machine settings (DB values, with env var fallbacks)
export async function GET() {
  try {
    const { sqliteDb } = await import("@/lib/sqlite-db");

    const dbMachineId = sqliteDb.getMachineId() || "";
    const rawName = sqliteDb.getMachineName() || "";
    const dbMachineName = rawName === "LeafWater_Default" ? "" : rawName;
    const dbMachineLocation = sqliteDb.getMachineLocation() || "";

    return NextResponse.json({
      success: true,
      machineId: dbMachineId || process.env.LW_MACHINE_ID || "",
      machineName: dbMachineName || process.env.LW_MACHINE_NAME || "",
      machineLocation: dbMachineLocation || process.env.LW_MACHINE_LOCATION || "",
      source: dbMachineId ? "database" : "env",
    });
  } catch (error: any) {
    console.error("[Machine Settings API] Error getting settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get machine settings" },
      { status: 500 }
    );
  }
}

// POST - Save machine settings to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { machineId, machineName, machineLocation } = body;

    if (!machineId || typeof machineId !== "string" || !machineId.trim()) {
      return NextResponse.json(
        { success: false, error: "Machine ID is required" },
        { status: 400 }
      );
    }

    const { sqliteDb } = await import("@/lib/sqlite-db");

    sqliteDb.setMachineId(machineId.trim());
    if (machineName?.trim()) sqliteDb.setMachineName(machineName.trim());
    if (machineLocation?.trim()) sqliteDb.setMachineLocation(machineLocation.trim());

    return NextResponse.json({
      success: true,
      machineId: machineId.trim(),
      machineName: machineName?.trim() || "",
      machineLocation: machineLocation?.trim() || "",
      message: "Machine settings updated successfully",
    });
  } catch (error: any) {
    console.error("[Machine Settings API] Error saving settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save machine settings" },
      { status: 500 }
    );
  }
}
