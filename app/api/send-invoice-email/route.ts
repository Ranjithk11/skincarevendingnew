import { NextRequest, NextResponse } from "next/server";

const DEFAULT_INVOICE_EMAIL_WEBHOOK_URL =
  process.env.INVOICE_EMAIL_WEBHOOK_URL || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, invoice } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice data is required" },
        { status: 400 }
      );
    }

    const webhookUrl = DEFAULT_INVOICE_EMAIL_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn("[send-invoice-email] INVOICE_EMAIL_WEBHOOK_URL not configured");
      return NextResponse.json(
        { success: false, error: "Email service not configured. Please set INVOICE_EMAIL_WEBHOOK_URL in .env.local" },
        { status: 503 }
      );
    }

    // Build full Tax Invoice payload matching reference format
    const items = (invoice.items || []).map((item: any, idx: number) => ({
      sl_no: idx + 1,
      description: item.name || "",
      hsn_sac: item.hsnSac || "3304",
      quantity: `${item.quantity || 1}.00 qty`,
      rate_incl_tax: Number(item.rateInclTax || item.price || 0).toFixed(2),
      rate: Number(item.rate || item.price || 0).toFixed(2),
      per: item.per || "qty",
      discount_pct: `${Number(item.discountPct || 0).toFixed(2)} %`,
      amount: Number(item.amount || 0).toFixed(2),
    }));

    const hsnBreakdown = (invoice.hsnBreakdown || []).map((h: any) => ({
      hsn_sac: h.hsnSac || "3304",
      taxable_value: Number(h.taxableValue || 0).toFixed(2),
      cgst_rate: `${Number(h.cgstRate || 18).toFixed(2)}%`,
      cgst_amount: Number(h.cgstAmount || 0).toFixed(2),
      sgst_rate: `${Number(h.sgstRate || 18).toFixed(2)}%`,
      sgst_amount: Number(h.sgstAmount || 0).toFixed(2),
      total_tax_amount: Number(h.totalTaxAmount || 0).toFixed(2),
    }));

    const webhookPayload = {
      event: "invoice_email",
      timestamp: new Date().toISOString(),

      // Recipient
      to_email: email,

      // Seller / Company
      company_name: invoice.companyName || "LeafWater Private Limited",
      company_address: invoice.companyAddress || "",
      company_email: invoice.companyEmail || "support@leafwater.in",
      gstin: invoice.gstin || "",
      state_name: invoice.stateName || "",
      place_of_supply: invoice.placeOfSupply || "",

      // Invoice header
      invoice_no: invoice.invoiceNo || "",
      invoice_date: invoice.invoiceDate || "",
      delivery_note: invoice.deliveryNote || "",
      mode_of_payment: invoice.modeOfPayment || "Online",
      reference_no_date: invoice.referenceNoDate || "",
      other_references: invoice.otherReferences || "",
      buyers_order_no: invoice.buyersOrderNo || "",
      buyers_order_date: invoice.buyersOrderDate || "",
      dispatch_doc_no: invoice.dispatchDocNo || "",
      delivery_note_date: invoice.deliveryNoteDate || "",
      dispatched_through: invoice.dispatchedThrough || "Vending Machine",
      destination: invoice.destination || "",
      terms_of_delivery: invoice.termsOfDelivery || "Immediate",

      // Buyer
      buyer_name: invoice.buyerName || "",
      buyer_email: invoice.buyerEmail || "",
      buyer_phone: invoice.buyerPhone || "",

      // Machine info
      machine_id: invoice.machineId || "",
      machine_name: invoice.machineName || "",
      machine_location: invoice.machineLocation || "",

      // Line items
      items,
      total_qty: `${Number(invoice.totalQty || 0).toFixed(2)} qty`,

      // Totals
      items_total: Number(invoice.itemsTotal || 0).toFixed(2),
      sgst_payable: Number(invoice.sgstPayable || invoice.sgst || 0).toFixed(2),
      cgst_payable: Number(invoice.cgstPayable || invoice.cgst || 0).toFixed(2),
      round_off: Number(invoice.roundOff || 0).toFixed(2),
      grand_total: Number(invoice.grandTotal || 0).toFixed(2),
      amount_in_words: invoice.amountInWords || "",
      payment_status: "Paid",

      // Tax breakdown table
      hsn_breakdown: hsnBreakdown,

      // Bank details
      bank_name: invoice.bankName || "",
      bank_account_holder: invoice.bankAccountHolder || "",
      bank_account_no: invoice.bankAccountNo || "",
      bank_branch_ifsc: invoice.bankBranchIFSC || "",

      // Footer
      declaration: invoice.declaration || "",
    };

    console.log("[send-invoice-email] Sending to webhook:", webhookUrl);
    console.log("[send-invoice-email] Payload:", JSON.stringify(webhookPayload, null, 2));

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await res.text().catch(() => "");
    console.log("[send-invoice-email] Webhook response:", res.status, responseText);

    // Make.com returns 200 with "Accepted" on success
    if (!res.ok) {
      console.error("[send-invoice-email] Webhook error:", res.status, responseText);
      return NextResponse.json(
        { success: false, error: `Webhook returned ${res.status}: ${responseText || "Unknown error"}` },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${email}`,
    });
  } catch (error: any) {
    console.error("[send-invoice-email] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
