import { NextRequest, NextResponse } from "next/server";

const DEFAULT_INVOICE_EMAIL_WEBHOOK_URL =
  process.env.INVOICE_EMAIL_WEBHOOK_URL ||
  "https://hook.eu1.make.com/g8odvmr2rp4er2n63dhmo3ku3uqbi4nu";

function normalizeProductId(id?: string): string {
  const raw = String(id || "").trim();
  if (!raw) return "";
  if (raw.startsWith("products/")) return raw;
  if (/^\d+$/.test(raw)) return `products/${raw}`;
  return raw;
}

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
        {
          success: false,
          error:
            "Email service not configured. Please set INVOICE_EMAIL_WEBHOOK_URL in .env.local",
        },
        { status: 503 }
      );
    }

    const occurredAt = new Date().toISOString();

    // Build full Tax Invoice payload matching Make.com reference format
    const items = (invoice.items || []).map((item: any, idx: number) => {
      const rateInclTax = Number(item.rateInclTax ?? item.rate ?? item.price ?? 0);
      const lineAmount = Number(item.amount ?? 0);
      const discountPct =
        item.discountPct !== undefined && item.discountPct !== null
          ? Number(item.discountPct)
          : rateInclTax > 0 && item.quantity
            ? ((rateInclTax * Number(item.quantity) - lineAmount) /
                (rateInclTax * Number(item.quantity))) *
              100
            : 0;

      return {
        sl_no: idx + 1,
        description: item.name || "",
        hsn_sac: item.hsnSac || "3304",
        quantity: `${item.quantity || 1}.00 qty`,
        rate_incl_tax: rateInclTax.toFixed(2),
        rate: Number(item.rate ?? item.price ?? rateInclTax).toFixed(2),
        per: item.per || "qty",
        discount_pct: `${Math.max(0, discountPct).toFixed(2)} %`,
        amount: lineAmount.toFixed(2),
      };
    });

    const productsFromInvoice = Array.isArray(invoice.products)
      ? invoice.products
      : (invoice.items || []).map((item: any) => ({
          id: item.id || "",
          name: item.name || "",
          quantity: Number(item.quantity) || 1,
          slotId: item.slotId ?? "",
          retailPrice: Number(item.rateInclTax ?? item.rate ?? item.price ?? 0),
          amount: Number(item.amount ?? 0),
        }));

    const products = productsFromInvoice.map((p: any) => ({
      id: normalizeProductId(p.id),
      name: p.name || "",
      quantity: Number(p.quantity) || 1,
      slot_id: p.slot_id !== undefined ? String(p.slot_id) : String(p.slotId ?? ""),
      retail_price: Number(p.retail_price ?? p.retailPrice ?? 0),
      amount: Number(p.amount ?? 0),
    }));

    const hsnBreakdown = (invoice.hsnBreakdown || []).map((h: any) => ({
      hsn_sac: h.hsnSac || "3304",
      taxable_value: Number(h.taxableValue || 0).toFixed(2),
      cgst_rate: `${Number(h.cgstRate || 9).toFixed(2)}%`,
      cgst_amount: Number(h.cgstAmount || 0).toFixed(2),
      sgst_rate: `${Number(h.sgstRate || 9).toFixed(2)}%`,
      sgst_amount: Number(h.sgstAmount || 0).toFixed(2),
      total_tax_amount: Number(h.totalTaxAmount || 0).toFixed(2),
    }));

    const payment = invoice.transaction || {};
    const command = invoice.command || {};
    const firstProduct = products[0];

    const webhookPayload = {
      event: "invoice_email",
      timestamp: occurredAt,
      occurred_at: occurredAt,

      // Recipient
      to_email: email,

      // Seller / Company
      company_name: invoice.companyName || "LeafWater Private Limited",
      company_address: invoice.companyAddress || "",
      company_email: invoice.companyEmail || "support@leafwater.in",
      gstin: invoice.gstin || "",
      state_name: invoice.stateName || invoice.state || "",
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

      // Line items (tax invoice rows)
      items,
      // Product info for Make / CRM (id, slot, retail, amount)
      products,

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

      // Payment transaction
      transaction: {
        order_id: payment.orderId || payment.order_id || "",
        payment_id: payment.paymentId || payment.payment_id || "",
        amount: Number(
          payment.amount ?? invoice.grandTotal ?? 0
        ),
        currency: payment.currency || "INR",
        status: payment.status || "paid",
        method: payment.method || "upi",
      },

      // Dispense / first-product command context
      command: {
        product_id: normalizeProductId(
          command.productId || command.product_id || firstProduct?.id || ""
        ),
        product_name:
          command.productName ||
          command.product_name ||
          firstProduct?.name ||
          "",
        slot_id: String(
          command.slotId ?? command.slot_id ?? firstProduct?.slot_id ?? ""
        ),
        command:
          command.command ||
          (firstProduct?.slot_id ? `RQ${firstProduct.slot_id}` : "DISPENSE"),
        timestamp: command.timestamp || occurredAt,
      },

      // PDF (filled by Make after generation, if not already provided)
      pdf_url: invoice.pdfUrl || invoice.pdf_url || "",

      // Bank details
      bank_name: invoice.bankName || "",
      bank_account_holder: invoice.bankAccountHolder || "",
      bank_account_no: invoice.bankAccountNo || "",
      bank_branch_ifsc: invoice.bankBranchIFSC || "",

      // Footer
      declaration: invoice.declaration || "",
    };

    console.log("[send-invoice-email] Sending to webhook:", webhookUrl);
    console.log(
      "[send-invoice-email] Payload:",
      JSON.stringify(webhookPayload, null, 2)
    );

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await res.text().catch(() => "");
    console.log(
      "[send-invoice-email] Webhook response:",
      res.status,
      responseText
    );

    // Make.com returns 200 with "Accepted" on success
    if (!res.ok) {
      console.error(
        "[send-invoice-email] Webhook error:",
        res.status,
        responseText
      );
      return NextResponse.json(
        {
          success: false,
          error: `Webhook returned ${res.status}: ${responseText || "Unknown error"}`,
        },
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
