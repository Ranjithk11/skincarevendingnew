import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const getFirstEnv = (keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return { key, value };
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
          mode?: "test" | "live";
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
    const mode = body.mode;

    if (!paymentId || !orderId || !signature) {
      return NextResponse.json(
        { success: false, error: { message: "Missing payment details" } },
        { status: 400 }
      );
    }

    const secretEnvKeys =
      mode === "live"
        ? ["RAZORPAY_LIVE_KEY_SECRET", "RAZORPAY_KEY_SECRET"]
        : mode === "test"
          ? ["RAZORPAY_TEST_KEY_SECRET", "RAZORPAY_KEY_SECRET"]
          : [
              "RAZORPAY_TEST_KEY_SECRET",
              "RAZORPAY_LIVE_KEY_SECRET",
              "RAZORPAY_KEY_SECRET",
            ];

    const { key: keySecretKey, value: keySecret } = getFirstEnv(secretEnvKeys);

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expected = Buffer.from(expectedSignature, "hex");
    const provided = Buffer.from(signature, "hex");

    if (expected.length !== provided.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            process.env.NODE_ENV === "production"
              ? { message: "Payment verification failed" }
              : {
                  message: "Payment verification failed",
                  debug: {
                    reason: "signature_length_mismatch",
                    mode,
                    keySecretKey,
                    orderId,
                    paymentId,
                    expectedSignature,
                    providedSignature: signature,
                    expectedLength: expected.length,
                    providedLength: provided.length,
                  },
                },
        },
        { status: 400 }
      );
    }

    const isValid = crypto.timingSafeEqual(
      new Uint8Array(expected),
      new Uint8Array(provided)
    );

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error:
            process.env.NODE_ENV === "production"
              ? { message: "Payment verification failed" }
              : {
                  message: "Payment verification failed",
                  debug: {
                    reason: "signature_mismatch",
                    mode,
                    keySecretKey,
                    orderId,
                    paymentId,
                    expectedSignature,
                    providedSignature: signature,
                  },
                },
        },
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
