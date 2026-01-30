import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const getFirstEnv = (keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error(`Missing environment variable: ${keys[0]}`);
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          razorpay_payment_id?: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        }
      | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid JSON body" } },
        { status: 400 }
      );
    }

    const paymentId = body.razorpay_payment_id;
    const orderId = body.razorpay_order_id;
    const signature = body.razorpay_signature;

    if (!paymentId || !orderId || !signature) {
      return NextResponse.json(
        { success: false, error: { message: "Missing payment details" } },
        { status: 400 }
      );
    }

    const keySecret = getFirstEnv([
      "RAZORPAY_KEY_SECRET",
      "RAZORPAY_TEST_KEY_SECRET",
      "RAZORPAY_LIVE_KEY_SECRET",
    ]);

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expected = Buffer.from(expectedSignature, "hex");
    const provided = Buffer.from(signature, "hex");

    if (expected.length !== provided.length) {
      return NextResponse.json(
        { success: false, error: { message: "Payment verification failed" } },
        { status: 400 }
      );
    }

    const isValid = crypto.timingSafeEqual(
      new Uint8Array(expected),
      new Uint8Array(provided)
    );

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { message: "Payment verification failed" } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { verified: true },
    });
  } catch (err: any) {
    const message =
      typeof err?.message === "string"
        ? err.message
        : "Error verifying payment";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
}
