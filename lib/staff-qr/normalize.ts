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
 * Make / HTTP modules sometimes return:
 * - raw JSON object
 * - a JSON string
 * - { body: "<json string>", status: 200, headers: [...] }
 * - [ { body, status, headers } ]
 */
export function unwrapUpstreamPayload(data: unknown): unknown {
  if (data == null) return null;

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) return null;
    try {
      return unwrapUpstreamPayload(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }

  if (typeof data !== "object") return null;

  // Make HTTP module / webhook response sometimes wraps as an array
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    return unwrapUpstreamPayload(data[0]);
  }

  const root = data as Record<string, unknown>;

  // HTTP-module style envelope
  if (typeof root.body === "string" && root.body.trim()) {
    try {
      return unwrapUpstreamPayload(JSON.parse(root.body));
    } catch {
      // fall through
    }
  }
  if (root.body && typeof root.body === "object") {
    return unwrapUpstreamPayload(root.body);
  }

  return root;
}

/**
 * Normalize heterogeneous upstream JSON (Make.com / custom API) into VerifiedStaff.
 */
export function normalizeStaffFromUpstream(
  hash: string,
  data: unknown
): VerifiedStaff | null {
  const unwrapped = unwrapUpstreamPayload(data);
  if (!unwrapped || typeof unwrapped !== "object") return null;
  const root = unwrapped as Record<string, unknown>;

  // Make QRAUTH: { success, data: { staffname: "Name|Phone|Branch" } }
  let nested: Record<string, unknown> = root;
  if (root.data && typeof root.data === "object") {
    nested = root.data as Record<string, unknown>;
  } else if (root.staff && typeof root.staff === "object") {
    nested = root.staff as Record<string, unknown>;
  } else if (root.user && typeof root.user === "object") {
    nested = root.user as Record<string, unknown>;
  } else if (root.value && typeof root.value === "object") {
    nested = root.value as Record<string, unknown>;
  }

  const staffnameRaw =
    asString(nested.staffname) ||
    asString(nested.staff_name) ||
    asString(nested.StaffName) ||
    asString(nested.Staffname) ||
    (typeof root.data === "string" ? asString(root.data) : "");

  const fromPipe = staffnameRaw
    ? parseStaffnamePipe(staffnameRaw)
    : null;

  const name =
    (fromPipe?.name && fromPipe.name) ||
    asString(nested.name) ||
    asString(nested.staffname) ||
    asString(nested.staff_name) ||
    asString(nested.agentName) ||
    asString(nested.agent_name);

  if (!name) return null;

  if (root.success === false || root.ok === false) return null;

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

  // Prefer a full 64-char hex SHA-256 (Make staff QR hashes)
  const sha256 = text.match(/[a-fA-F0-9]{64}/);
  if (sha256) return sha256[0];

  if (/^[A-Za-z0-9_-]{8,256}$/.test(text)) return text;

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

  const match = text.match(/[A-Za-z0-9_-]{8,256}/);
  return match?.[0] || text;
}
