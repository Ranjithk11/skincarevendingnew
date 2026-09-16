import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const IS_VERCEL = process.env.VERCEL === "1";

function envMachineSettings() {
  return {
    success: true,
    machineId: process.env.LW_MACHINE_ID || "",
    machineName: process.env.LW_MACHINE_NAME || "",
    machineLocation: process.env.LW_MACHINE_LOCATION || "",
    source: "env" as const,
  };
}

// GET - Machine settings (DB on kiosk, env vars on Vercel)
export async function GET() {
  if (IS_VERCEL) {
    return NextResponse.json(envMachineSettings());
  }

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
  } catch (error: unknown) {
    console.error("[Machine Settings API] Error getting settings:", error);
    return NextResponse.json(envMachineSettings());
  }
}

// POST - Save machine settings to database (kiosk only)
export async function POST(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json(
      {
        success: false,
        error: "Machine settings are read-only on Vercel. Set LW_MACHINE_* env vars.",
      },
      { status: 503 }
    );
  }

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

    try {
      const { clearLandingImageCaches } = await import(
        "@/lib/landing-image.server"
      );
      clearLandingImageCaches();
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      machineId: machineId.trim(),
      machineName: machineName?.trim() || "",
      machineLocation: machineLocation?.trim() || "",
      message: "Machine settings updated successfully",
      refreshLandingImage: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save machine settings";
    console.error("[Machine Settings API] Error saving settings:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
