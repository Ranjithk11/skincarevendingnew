import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

// GET all vending slots
export async function GET() {
  try {
    const slots = adminDb.getAllSlots();
    return NextResponse.json(slots);
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}

// POST to assign product to slot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slot_id, product_id, quantity = 0 } = body;

    if (!slot_id) {
      return NextResponse.json(
        { success: false, message: "Slot ID is required" },
        { status: 400 }
      );
    }

    const slot = adminDb.assignProductToSlot(
      parseInt(slot_id),
      product_id ? parseInt(product_id) : null,
      parseInt(quantity)
    );

    if (!slot) {
      return NextResponse.json(
        { success: false, message: "Slot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Slot ${slot_id} updated successfully`,
      slot,
    });
  } catch (error) {
    console.error("Error assigning product to slot:", error);
    return NextResponse.json(
      { success: false, message: "Failed to assign product" },
      { status: 500 }
    );
  }
}
