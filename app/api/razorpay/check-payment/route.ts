import { NextResponse } from "next/server";
import {
  checkQrPaymentStatus,
  createRazorpayClient,
  resolveRazorpayPaymentId,
  type RazorpayMode,
} from "@/lib/razorpayPaymentResolve";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          qrCodeId?: string;
          orderId?: string;
          mode?: RazorpayMode;
        }
      | null;

    if (!body || (!body.qrCodeId && !body.orderId)) {
      return NextResponse.json(
        { success: false, error: { message: "qrCodeId or orderId is required" } },
        { status: 400 }
      );
    }

    const mode = body.mode ?? "test";
    const razorpay = createRazorpayClient(mode);

    if (!razorpay) {
      return NextResponse.json(
        { success: false, error: { message: `Missing Razorpay ${mode} credentials` } },
        { status: 500 }
      );
    }

    if (body.qrCodeId) {
      const result = await checkQrPaymentStatus(
        razorpay,
        body.qrCodeId,
        body.orderId
      );

      if (result.paid) {
        return NextResponse.json({
          success: true,
          paid: true,
          paymentId: result.paymentId,
          orderId: result.orderId || body.orderId || "",
          amount: result.amount,
        });
      }

      return NextResponse.json({
        success: true,
        paid: false,
        status: result.status,
      });
    }

    if (body.orderId) {
      const order = await razorpay.orders.fetch(body.orderId);

      if (order.status === "paid") {
        const resolved = await resolveRazorpayPaymentId(
          razorpay,
          { orderId: body.orderId },
          3
        );

        return NextResponse.json({
          success: true,
          paid: true,
          paymentId: resolved.paymentId,
          orderId: resolved.orderId || body.orderId,
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
