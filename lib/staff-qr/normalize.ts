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
  const nested =
    (root.staff as Record<string, unknown> | undefined) ||
    (root.data as Record<string, unknown> | undefined) ||
    (root.user as Record<string, unknown> | undefined) ||
    (root.value as Record<string, unknown> | undefined) ||
    root;

  const name =
    asString(nested.name) ||
    asString(nested.staff_name) ||
    asString(nested.agentName) ||
    asString(nested.agent_name);

  if (!name) return null;

  const active = asBool(
    nested.active ?? nested.is_active ?? nested.enabled ?? nested.status,
    true
  );

  // status: "inactive" string handled via asBool when value is string
  const statusStr = asString(nested.status).toLowerCase();
  const activeFromStatus =
    statusStr === ""
      ? active
      : !["inactive", "disabled", "revoked", "blocked"].includes(statusStr);

  return {
    hash: asString(nested.hash) || asString(nested.key) || hash,
    name,
    phone: asString(nested.phone) || asString(nested.mobile) || undefined,
    role: asString(nested.role) || asString(nested.designation) || undefined,
    branch: asString(nested.branch) || asString(nested.location) || undefined,
    active: active && activeFromStatus,
    qrUrl:
      asString(nested.qr_url) ||
      asString(nested.qrUrl) ||
      asString(nested.qr_image_url) ||
      undefined,
    raw: nested,
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
