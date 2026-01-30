import Razorpay from "razorpay";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let keyIdForDebug: string | undefined;
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
    const receipt = body.receipt;
    const mode = body.mode ?? "test";

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid amount" } },
        { status: 400 }
      );
    }

    if (typeof currency !== "string" || currency.length < 3) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid currency" } },
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

    keyIdForDebug = keyId;

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      ...(receipt ? { receipt } : {}),
      payment_capture: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        keyId,
        order,
      },
    });
  } catch (err: any) {
    const statusCode =
      typeof err?.statusCode === "number"
        ? err.statusCode
        : typeof err?.response?.status === "number"
          ? err.response.status
          : 500;

    const details =
      err?.error?.description ||
      err?.error?.reason ||
      err?.response?.data?.error?.description ||
      err?.response?.data?.error?.reason ||
      err?.response?.data?.error?.code ||
      err?.message;

    const message =
      process.env.NODE_ENV === "production"
        ? "Failed to create order"
        : typeof details === "string" && details.trim().length > 0
          ? details
          : "Failed to create order";

    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "production"
            ? { message }
            : {
                message,
                statusCode,
                keyId: keyIdForDebug,
                raw: {
                  statusCode: err?.statusCode,
                  error: err?.error,
                  responseData: err?.response?.data,
                },
              },
      },
      { status: statusCode }
    );
  }
}
