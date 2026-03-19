import { NextRequest, NextResponse } from "next/server";

// GET - Get machine name (priority: env var -> db setting)
export async function GET() {
  try {
    // Priority 1: Environment variable
    const envMachineName = process.env.NEXT_PUBLIC_MACHINE_NAME;
    if (envMachineName) {
      return NextResponse.json({ 
        success: true, 
        machineName: envMachineName,
        source: 'env'
      });
    }

    // Priority 2: Database setting
    const { sqliteDb } = await import("@/lib/sqlite-db");
    const dbMachineName = sqliteDb.getMachineName();
    
    return NextResponse.json({ 
      success: true, 
      machineName: dbMachineName,
      source: 'database'
    });
  } catch (error: any) {
    console.error("[Machine Name API] Error getting machine name:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get machine name" },
      { status: 500 }
    );
  }
}

// POST - Set machine name in database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { machineName } = body;

    if (!machineName || typeof machineName !== "string") {
      return NextResponse.json(
        { success: false, error: "Machine name is required" },
        { status: 400 }
      );
    }

    const trimmedName = machineName.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { success: false, error: "Machine name cannot be empty" },
        { status: 400 }
      );
    }

    const { sqliteDb } = await import("@/lib/sqlite-db");
    sqliteDb.setMachineName(trimmedName);

    return NextResponse.json({ 
      success: true, 
      machineName: trimmedName,
      message: "Machine name updated successfully"
    });
  } catch (error: any) {
    console.error("[Machine Name API] Error setting machine name:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to set machine name" },
      { status: 500 }
    );
  }
}
