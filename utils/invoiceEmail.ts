/** Fallback invoice recipient when the user has no email (matches questionnaire flow). */
export function getMachineFallbackInvoiceEmail(
  machineId?: string,
  machineLocation?: string
): string {
  const source =
    machineId?.trim() ||
    machineLocation?.trim() ||
    "leafwater_vending";
  const slug = source.replace(/-/g, "_").replace(/\s+/g, "_").toLowerCase();
  return `${slug}@gmail.com`;
}

export function resolveInvoiceRecipientEmail(
  sessionEmail: string | undefined,
  machineId?: string,
  machineLocation?: string
): string {
  const trimmed = (sessionEmail || "").trim();
  if (trimmed.includes("@")) return trimmed;
  return getMachineFallbackInvoiceEmail(machineId, machineLocation);
}
