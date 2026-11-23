import { NextResponse } from "next/server";
import {
  findDispenseSupportIssue,
  isValidEmail,
  normalizeIndianMobile,
  normalizePersonName,
  WHATSAPP_SERVICE_DISPLAY,
} from "@/lib/dispense-support";

export const dynamic = "force-dynamic";

const SUPPORT_WEBHOOK_URL =
  process.env.DISPENSE_SUPPORT_WEBHOOK_URL ||
  "https://hook.eu1.make.com/uzec36jvbkb6wlwsbro5umuuhj0p55or";

type ProductInput = {
  id?: string;
  name?: string;
  quantity?: number;
  slotId?: string | number;
};

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }

  const issue = findDispenseSupportIssue(String(body.issueId || ""));
  const customerName = normalizePersonName(String(body.customerName || ""));
  const phone = normalizeIndianMobile(String(body.phone || ""));
  const email = String(body.email || "").trim().toLowerCase();

  if (!issue || !customerName || !phone || !isValidEmail(email)) {
    return NextResponse.json(
      { success: false, error: "Share a name, a valid mobile number, a valid email, and the issue." },
      { status: 400 }
    );
  }

  const products = Array.isArray(body.products) ? (body.products as ProductInput[]) : [];
  const summary = {
    issueId: issue.id,
    issueLabel: issue.label,
    customerName,
    phone: `+91${phone}`,
    email,
    orderId: String(body.orderId || "").trim(),
    paymentId: String(body.paymentId || "").trim(),
    machineName: String(body.machineName || "").trim(),
    machineLocation: String(body.machineLocation || "").trim(),
    dispenseStatus: String(body.dispenseStatus || "").trim(),
    products: products.map((item) => ({
      id: item?.id || "",
      name: item?.name || "",
      quantity: item?.quantity ?? 1,
      slotId: item?.slotId ?? "",
    })),
  };

  let savedId: number | null = null;
  try {
    const { sqliteDb } = await import("@/lib/sqlite-db");
    savedId = sqliteDb.saveDispenseSupportRequest({
      issueId: summary.issueId,
      issueLabel: summary.issueLabel,
      customerName: summary.customerName,
      phone: summary.phone,
      email: summary.email,
      orderId: summary.orderId,
      paymentId: summary.paymentId,
      machineName: summary.machineName,
      machineLocation: summary.machineLocation,
      productsJson: JSON.stringify(summary.products),
      dispenseStatus: summary.dispenseStatus,
    });
  } catch (err) {
    console.error("[dispense-support] save failed:", err);
  }

  const message =
    `Customer needs a callback. Name: ${summary.customerName}. ` +
    `Issue: ${summary.issueLabel}. Phone: ${summary.phone}. Email: ${summary.email}. ` +
    `They were asked to photograph the issue and send the photos on WhatsApp ${WHATSAPP_SERVICE_DISPLAY}.`;

  let notified = false;
  try {
    const response = await fetch(SUPPORT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "dispense_support_request",
        message,
        occurred_at: new Date().toISOString(),
        issue_id: summary.issueId,
        issue_label: summary.issueLabel,
        customer_name: summary.customerName,
        customer_phone: summary.phone,
        customer_email: summary.email,
        customer: {
          name: summary.customerName,
          phone: summary.phone,
          email: summary.email,
        },
        issue: {
          id: summary.issueId,
          label: summary.issueLabel,
        },
        whatsapp_care: WHATSAPP_SERVICE_DISPLAY,
        photo_requested: true,
        machine_name: summary.machineName,
        machine_location: summary.machineLocation,
        order_id: summary.orderId,
        payment_id: summary.paymentId,
        dispense_status: summary.dispenseStatus,
        products: summary.products,
      }),
    });
    notified = response.ok;
    if (!response.ok) {
      console.warn("[dispense-support] webhook status:", response.status);
    }
  } catch (err) {
    console.warn("[dispense-support] webhook failed:", err);
  }

  if (savedId == null && !notified) {
    return NextResponse.json(
      { success: false, error: "Could not file this request. Please use WhatsApp." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, id: savedId, notified });
}
