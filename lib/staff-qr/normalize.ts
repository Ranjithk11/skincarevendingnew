import type { StaffQrVerifyResult, VerifiedStaff } from "./types";

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["false", "0", "no", "inactive", "disabled"].includes(v)) return false;
    if (["true", "1", "yes", "active", "enabled"].includes(v)) return true;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}

/**
 * Make QRAUTH returns: data.staffname = "Rajesh|9960278391|Aiportm4"
 * → name | phone | branch/location
 */
export function parseStaffnamePipe(raw: string): {
  name: string;
  phone?: string;
  branch?: string;
  display: string;
} {
  const display = String(raw || "").trim();
  if (!display) return { name: "", display: "" };

  const parts = display.split("|").map((p) => p.trim());
  const name = parts[0] || display;
  const phone = parts[1] || undefined;
  const branch = parts[2] || undefined;
  return { name, phone, branch, display };
}

/**
 * Normalize heterogeneous upstream JSON (Make.com / custom API) into VerifiedStaff.
 * Accepts common field aliases so swapping APIs later is low-friction.
 */
export function normalizeStaffFromUpstream(
  hash: string,
  data: unknown
): VerifiedStaff | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;

  // Nested shapes: { staff: {...} } | { data: {...} } | { user: {...} } | flat
  // Make QRAUTH: { success, data: { staffname: "Name|Phone|Branch" } }
  const nested =
    (root.staff as Record<string, unknown> | undefined) ||
    (root.data as Record<string, unknown> | undefined) ||
    (root.user as Record<string, unknown> | undefined) ||
    (root.value as Record<string, unknown> | undefined) ||
    root;

  // Pipe format from Make: "Rajesh|9960278391|Aiportm4"
  const staffnameRaw =
    asString(nested.staffname) ||
    asString(nested.staff_name) ||
    asString(nested.StaffName) ||
    (typeof root.data === "string" ? asString(root.data) : "");

  const fromPipe = staffnameRaw.includes("|")
    ? parseStaffnamePipe(staffnameRaw)
    : null;

  const name =
    fromPipe?.name ||
    asString(nested.name) ||
    asString(nested.staffname) ||
    asString(nested.staff_name) ||
    asString(nested.agentName) ||
    asString(nested.agent_name);

  if (!name) return null;

  const active = asBool(
    nested.active ?? nested.is_active ?? nested.enabled ?? nested.status,
    true
  );

  const statusStr = asString(nested.status).toLowerCase();
  const activeFromStatus =
    statusStr === ""
      ? active
      : !["inactive", "disabled", "revoked", "blocked"].includes(statusStr);

  return {
    hash: asString(nested.hash) || asString(nested.key) || hash,
    name,
    phone:
      fromPipe?.phone ||
      asString(nested.phone) ||
      asString(nested.mobile) ||
      undefined,
    role: asString(nested.role) || asString(nested.designation) || undefined,
    branch:
      fromPipe?.branch ||
      asString(nested.branch) ||
      asString(nested.location) ||
      undefined,
    active: active && activeFromStatus,
    qrUrl:
      asString(nested.qr_url) ||
      asString(nested.qrUrl) ||
      asString(nested.qr_image_url) ||
      undefined,
    raw: {
      ...nested,
      staffname_display: fromPipe?.display || staffnameRaw || name,
    },
  };
}

export function toVerifyFailure(
  code: Extract<StaffQrVerifyResult, { ok: false }>["code"],
  message: string
): StaffQrVerifyResult {
  return { ok: false, code, message };
}

export function extractHashFromQrText(raw: string): string {
  const text = String(raw || "").trim();
  if (!text) return "";

  // Plain hash
  if (/^[A-Za-z0-9_-]{8,256}$/.test(text)) return text;

  // JSON payload { "hash": "..." }
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const hash =
        asString(parsed.hash) ||
        asString(parsed.key) ||
        asString(parsed.id) ||
        asString(parsed.staff_hash);
      if (hash) return hash;
    } catch {
      /* ignore */
    }
  }

  // URL ?hash=... or /verify/HASH
  try {
    if (text.includes("://") || text.startsWith("http")) {
      const url = new URL(text);
      const fromQuery =
        url.searchParams.get("hash") ||
        url.searchParams.get("key") ||
        url.searchParams.get("id");
      if (fromQuery) return fromQuery.trim();
      const parts = url.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && /^[A-Za-z0-9_-]{8,256}$/.test(last)) return last;
    }
  } catch {
    /* ignore */
  }

  // Fallback: first token that looks like a hash
  const match = text.match(/[A-Za-z0-9_-]{8,256}/);
  return match?.[0] || text;
}
