import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/admin-db";

// GET slot info by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params;
    const slot = adminDb.getSlot(parseInt(slotId));

    if (!slot) {
      return NextResponse.json(
        { error: "Slot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(slot);
  } catch (error) {
    console.error("Error fetching slot:", error);
    return NextResponse.json(
      { error: "Failed to fetch slot" },
      { status: 500 }
    );
  }
}

// PATCH to update slot quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params;
    const body = await request.json();
    const { change_amount, quantity } = body;

    if (change_amount === undefined && quantity === undefined) {
      return NextResponse.json(
        { success: false, message: "change_amount or quantity is required" },
        { status: 400 }
      );
    }

    const slotIdNum = parseInt(slotId);
    const slot =
      quantity !== undefined
        ? adminDb.setSlotQuantity(slotIdNum, parseInt(quantity))
        : adminDb.updateSlotQuantity(slotIdNum, parseInt(change_amount));

    if (!slot) {
      return NextResponse.json(
        { success: false, message: "Slot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Slot ${slotId} quantity updated`,
      slot,
    });
  } catch (error) {
    console.error("Error updating slot quantity:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update quantity" },
      { status: 500 }
    );
  }
}
