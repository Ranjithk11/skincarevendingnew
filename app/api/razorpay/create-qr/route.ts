import Razorpay from "razorpay";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          amount: number;
          currency?: string;
          receipt?: string;
          mode?: "test" | "live";
        }
      | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid JSON body" } },
        { status: 400 }
      );
    }

    const amount = body.amount;
    const currency = body.currency ?? "INR";
    const receipt = body.receipt ?? `qr_${Date.now()}`;
    const mode = body.mode ?? "test";

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid amount" } },
        { status: 400 }
      );
    }

    let keyId: string;
    let keySecret: string;

    if (mode === "live") {
      keyId = process.env.RAZORPAY_LIVE_KEY_ID || "";
      keySecret = process.env.RAZORPAY_LIVE_KEY_SECRET || "";
    } else {
      keyId = process.env.RAZORPAY_TEST_KEY_ID || "";
      keySecret = process.env.RAZORPAY_TEST_KEY_SECRET || "";
    }

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, error: { message: `Missing Razorpay ${mode} credentials` } },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // First create an order
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt,
      payment_capture: true,
    });

    // Create QR code for UPI payment
    const closeby = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
    const qrCode = await (razorpay as any).qrCode.create({
      type: "upi_qr",
      name: "Leafwater",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: Math.round(amount),
      description: receipt,
      close_by: closeby,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        qrCodeId: qrCode.id,
        imageUrl: qrCode.image_url,
        amount: Math.round(amount),
        currency,
      },
    });
  } catch (err: any) {
    console.error("[create-qr] Error:", err);

    const message =
      err?.error?.description ||
      err?.error?.reason ||
      err?.message ||
      "Failed to create QR code";

    return NextResponse.json(
      { success: false, error: { message } },
      { status: err?.statusCode || 500 }
    );
  }
}
