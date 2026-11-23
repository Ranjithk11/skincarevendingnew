export const WHATSAPP_SERVICE_DISPLAY = "+91 89770 16605";
export const WHATSAPP_SERVICE_E164 = "918977016605";

export const DISPENSE_SUPPORT_ISSUES = [
  {
    id: "machine_not_responding",
    label: "Machine not responding after payment",
    hint: "Payment went through, and the machine stayed still",
    icon: "mdi:credit-card-off-outline",
  },
  {
    id: "com_issue",
    label: "COM issue",
    hint: "A connection problem with the machine",
    icon: "mdi:lan-disconnect",
  },
  {
    id: "tray_not_moving",
    label: "Tray is not moving",
    hint: "The tray did not come forward",
    icon: "mdi:tray",
  },
  {
    id: "door_not_opened",
    label: "Dispense door not opened",
    hint: "The door stayed shut after payment",
    icon: "mdi:door",
  },
  {
    id: "partial_dispense",
    label: "Got only one product instead of multiple",
    hint: "One item came out, and the rest did not",
    icon: "mdi:numeric-1-box-outline",
  },
] as const;

export type DispenseSupportIssueId = (typeof DISPENSE_SUPPORT_ISSUES)[number]["id"];

export function findDispenseSupportIssue(id: string) {
  return DISPENSE_SUPPORT_ISSUES.find((issue) => issue.id === id);
}

/** 10-digit Indian mobile, or null when the value cannot be used for a callback. */
export function normalizeIndianMobile(raw: string): string | null {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return digits;
}

export function formatIndianMobile(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

/** Left over from a local check. Never accept or store it. */
export const BLOCKED_SUPPORT_EMAIL = "kiosk.support.test@example.com";

export function isValidEmail(raw: string): boolean {
  const email = String(raw || "").trim().toLowerCase();
  if (!email || email === BLOCKED_SUPPORT_EMAIL) return false;
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}

/** A person's name, or null when it is too short or not a name. */
export function normalizePersonName(raw: string): string | null {
  const name = String(raw || "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) return null;
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) return null;
  return name;
}
