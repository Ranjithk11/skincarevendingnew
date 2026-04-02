import Razorpay from "razorpay";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          qrCodeId?: string;
          orderId?: string;
          mode?: "test" | "live";
        }
      | null;

    if (!body || (!body.qrCodeId && !body.orderId)) {
      return NextResponse.json(
        { success: false, error: { message: "qrCodeId or orderId is required" } },
        { status: 400 }
      );
    }

    const mode = body.mode ?? "test";

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

    // Check QR code payment status
    if (body.qrCodeId) {
      const qrCode = await (razorpay as any).qrCode.fetch(body.qrCodeId);

      if (qrCode.payments_count_received > 0 && qrCode.status === "closed") {
        // Fetch the payments for this QR code
        const payments = await (razorpay as any).qrCode.fetchAllPayments(body.qrCodeId, {
          count: 1,
        });

        const payment = payments?.items?.[0];

        return NextResponse.json({
          success: true,
          paid: true,
          paymentId: payment?.id || "",
          orderId: payment?.order_id || body.orderId || "",
          amount: qrCode.payment_amount,
        });
      }

      return NextResponse.json({
        success: true,
        paid: false,
        status: qrCode.status,
      });
    }

    // Fallback: check order status
    if (body.orderId) {
      const order = await razorpay.orders.fetch(body.orderId);

      if (order.status === "paid") {
        const payments = await razorpay.orders.fetchPayments(body.orderId);
        const payment = (payments as any)?.items?.[0];

        return NextResponse.json({
          success: true,
          paid: true,
          paymentId: payment?.id || "",
          orderId: body.orderId,
          amount: order.amount,
        });
      }

      return NextResponse.json({
        success: true,
        paid: false,
        status: order.status,
      });
    }

    return NextResponse.json({ success: true, paid: false });
  } catch (err: any) {
    console.error("[check-payment] Error:", err);

    return NextResponse.json(
      {
        success: false,
        error: {
          message: err?.error?.description || err?.message || "Failed to check payment status",
        },
      },
      { status: err?.statusCode || 500 }
    );
  }
}
