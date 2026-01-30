import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

// POST to sync product quantities
export async function POST() {
  try {
    adminDb.syncProductQuantities();
    return NextResponse.json({
      success: true,
      message: "Product quantities synchronized successfully",
    });
  } catch (error) {
    console.error("Error syncing quantities:", error);
    return NextResponse.json(
      { success: false, message: "Failed to sync quantities" },
      { status: 500 }
    );
  }
}
