const DEFAULT_HSN = "3304";
const GST_RATE = 18;
const CGST_RATE = 9;
const SGST_RATE = 9;

export type CheckoutInvoiceItem = {
  name: string;
  quantity: number;
  hsnSac: string;
  /** MRP / rate incl. of tax per unit (before discounts). */
  rateInclTax: number;
  rate: number;
  discountPct: number;
  amount: number;
  /** For on-screen display (legacy fields). */
  price: number;
};

export type CheckoutInvoiceData = {
  invoiceNo: string;
  invoiceDate: string;
  orderReference: string;
  gstin: string;
  state: string;
  placeOfSupply: string;
  items: CheckoutInvoiceItem[];
  totalQty: number;
  itemsTotal: string;
  grossTotal: number;
  orderDiscount: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  cgstPayable: number;
  sgstPayable: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
  hsnBreakdown: Array<{
    hsnSac: string;
    taxableValue: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    totalTaxAmount: number;
  }>;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  machineId: string;
  machineName: string;
  machineLocation: string;
};

export const parseCheckoutPrice = (priceText?: string): number => {
  if (!priceText) return 0;
  const normalized = String(priceText).replace(/,/g, " ");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : 0;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type RawCheckoutItem = {
  name?: string;
  quantity?: number;
  priceText?: string;
  originalPrice?: number;
  discountValue?: number;
  retail_price?: number;
};

export function buildCheckoutInvoice(params: {
  checkoutSummary: {
    total?: number;
    discount?: number;
    payableTotal?: number;
    payment?: { orderId?: string };
  };
  checkoutItems: RawCheckoutItem[];
  invoiceNo: string;
  invoiceDate: string;
  orderReference: string;
  amountInWords: (n: number) => string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  machineId: string;
  machineName: string;
  machineLocation: string;
  gstin?: string;
  state?: string;
  placeOfSupply?: string;
}): CheckoutInvoiceData {
  const payableTotal = round2(Number(params.checkoutSummary.payableTotal || 0));
  const orderDiscount = round2(Math.max(0, Number(params.checkoutSummary.discount || 0)));
  const grossTotal = round2(
    Number(params.checkoutSummary.total || 0) ||
      params.checkoutItems.reduce((sum, item) => {
        const unit = parseCheckoutPrice(item.priceText);
        const qty = Number(item.quantity) || 1;
        return sum + unit * qty;
      }, 0)
  );

  const preCouponLines = params.checkoutItems.map((item) => {
    const qty = Number(item.quantity) || 1;
    const unitAfterSlot = parseCheckoutPrice(item.priceText);
    const mrpPerUnit = round2(
      Number(item.originalPrice) > 0
        ? Number(item.originalPrice)
        : Number(item.retail_price) > 0
          ? Number(item.retail_price)
          : unitAfterSlot
    );
    const lineAfterSlot = round2(unitAfterSlot * qty);
    const lineMrp = round2(mrpPerUnit * qty);
    return { item, qty, mrpPerUnit, lineAfterSlot, lineMrp };
  });

  const sumAfterSlot = preCouponLines.reduce((s, l) => s + l.lineAfterSlot, 0);

  let allocated = 0;
  const items: CheckoutInvoiceItem[] = preCouponLines.map((line, index) => {
    const isLast = index === preCouponLines.length - 1;
    const couponShare =
      orderDiscount > 0 && sumAfterSlot > 0
        ? isLast
          ? round2(orderDiscount - allocated)
          : round2((orderDiscount * line.lineAfterSlot) / sumAfterSlot)
        : 0;
    allocated = round2(allocated + couponShare);

    const lineFinal = round2(Math.max(0, line.lineAfterSlot - couponShare));
    const discountPct =
      line.lineMrp > 0 ? round2(((line.lineMrp - lineFinal) / line.lineMrp) * 100) : 0;

    return {
      name: line.item.name || "",
      quantity: line.qty,
      hsnSac: DEFAULT_HSN,
      rateInclTax: line.mrpPerUnit,
      rate: line.mrpPerUnit,
      discountPct,
      amount: lineFinal,
      price: line.mrpPerUnit,
    };
  });

  const lineSum = round2(items.reduce((s, it) => s + it.amount, 0));
  if (items.length > 0 && Math.abs(lineSum - payableTotal) >= 0.02) {
    const diff = round2(payableTotal - lineSum);
    items[items.length - 1].amount = round2(items[items.length - 1].amount + diff);
    const last = items[items.length - 1];
    const lastMrp = round2(last.rateInclTax * last.quantity);
    last.discountPct = lastMrp > 0 ? round2(((lastMrp - last.amount) / lastMrp) * 100) : 0;
  }

  const baseForTax = round2(payableTotal / (1 + GST_RATE / 100));
  const totalGst = round2(payableTotal - baseForTax);
  const cgst = round2(totalGst / 2);
  const sgst = round2(totalGst / 2);
  const beforeRound = round2(baseForTax + cgst + sgst);
  const roundOff = round2(payableTotal - beforeRound);

  const hsnMap = new Map<string, number>();
  for (const item of items) {
    const taxable = round2(item.amount / (1 + GST_RATE / 100));
    hsnMap.set(item.hsnSac, round2((hsnMap.get(item.hsnSac) || 0) + taxable));
  }

  const hsnBreakdown = Array.from(hsnMap.entries()).map(([hsnSac, taxableValue]) => {
    const cgstAmount = round2(taxableValue * (CGST_RATE / 100));
    const sgstAmount = round2(taxableValue * (SGST_RATE / 100));
    return {
      hsnSac,
      taxableValue,
      cgstRate: CGST_RATE,
      cgstAmount,
      sgstRate: SGST_RATE,
      sgstAmount,
      totalTaxAmount: round2(cgstAmount + sgstAmount),
    };
  });

  return {
    invoiceNo: params.invoiceNo,
    invoiceDate: params.invoiceDate,
    orderReference: params.orderReference,
    gstin: params.gstin || "36AAKCL W1234A1ZC",
    state: params.state || "Telangana, Code : 36",
    placeOfSupply: params.placeOfSupply || "Telangana",
    items,
    totalQty: items.reduce((sum, it) => sum + it.quantity, 0),
    itemsTotal: baseForTax.toFixed(2),
    grossTotal,
    orderDiscount,
    subtotal: payableTotal,
    cgst,
    sgst,
    cgstPayable: cgst,
    sgstPayable: sgst,
    roundOff,
    grandTotal: payableTotal,
    amountInWords: params.amountInWords(payableTotal),
    hsnBreakdown,
    buyerName: params.buyerName,
    buyerEmail: params.buyerEmail,
    buyerPhone: params.buyerPhone,
    machineId: params.machineId,
    machineName: params.machineName,
    machineLocation: params.machineLocation,
  };
}
