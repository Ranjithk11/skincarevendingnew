/**
 * Analytics Backend API Client
 *
 * Connects to the LW Sales / Vending Machine Analytics backend (FastAPI).
 * Handles JWT authentication, token management, and all API calls.
 *
 * Required Environment Variables:
 * - LW_ANALYTICS_URL: Backend base URL (e.g. http://localhost:8000)
 * - LW_ANALYTICS_USERNAME: Login username
 * - LW_ANALYTICS_PASSWORD: Login password
 * - LW_MACHINE_ID: This vending machine's ID (e.g. LW-VM-Floor1)
 * - LW_MACHINE_API_KEY: X-API-Key for machine-facing endpoints
 */

import crypto from "crypto";

// ============================================================================
// Configuration
// ============================================================================

export function getAnalyticsConfig() {
  // Read dynamic machine settings from SQLite (set via admin UI),
  // falling back to env vars
  let dbMachineId = "";
  let dbMachineName = "";
  let dbMachineLocation = "";
  try {
    const { sqliteDb } = require("@/lib/sqlite-db");
    dbMachineId = sqliteDb.getMachineId() || "";
    const rawName = sqliteDb.getMachineName() || "";
    dbMachineName = rawName === "LeafWater_Default" ? "" : rawName;
    dbMachineLocation = sqliteDb.getMachineLocation() || "";
  } catch {
    // SQLite not available (e.g. during build), use env vars only
  }

  return {
    baseUrl: (process.env.LW_ANALYTICS_URL || "http://localhost:8000").replace(/\/+$/, ""),
    username: process.env.LW_ANALYTICS_USERNAME || "admin",
    password: process.env.LW_ANALYTICS_PASSWORD || "",
    machineId: dbMachineId || process.env.LW_MACHINE_ID || "",
    machineName: dbMachineName || process.env.LW_MACHINE_NAME || "",
    machineLocation: dbMachineLocation || process.env.LW_MACHINE_LOCATION || "",
    apiKey: process.env.LW_MACHINE_API_KEY || "",
  };
}

// ============================================================================
// Token Management (in-memory cache)
// ============================================================================

let cachedToken: string | null = null;
let tokenExpiry: number = 0; // Unix ms

function setToken(token: string, ttlMs: number = 23 * 60 * 60 * 1000) {
  cachedToken = token;
  tokenExpiry = Date.now() + ttlMs;
}

function getToken(): string | null {
  if (!cachedToken || Date.now() >= tokenExpiry) return null;
  return cachedToken;
}

export function clearToken() {
  cachedToken = null;
  tokenExpiry = 0;
}

// ============================================================================
// Auth
// ============================================================================

export interface LoginResponse {
  access_token: string;
  token_type: string;
  username: string;
  role: string;
}

export async function login(username?: string, password?: string): Promise<LoginResponse> {
  const config = getAnalyticsConfig();
  const u = username || config.username;
  const p = password || config.password;

  if (!u || !p) {
    throw new Error("[Analytics] Username and password are required for login");
  }

  const res = await fetch(`${config.baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      `[Analytics] Login failed (${res.status}): ${err?.detail || err?.message || res.statusText}`
    );
  }

  const data: LoginResponse = await res.json();
  setToken(data.access_token);
  return data;
}

/**
 * Get a valid Bearer token, auto-login if needed.
 */
export async function getValidToken(): Promise<string> {
  const existing = getToken();
  if (existing) return existing;

  const data = await login();
  return data.access_token;
}

// ============================================================================
// Fetch helpers
// ============================================================================

interface FetchOptions {
  method?: string;
  body?: any;
  params?: Record<string, string | number | undefined>;
  useApiKey?: boolean; // Use X-API-Key instead of Bearer token
}

/**
 * Authenticated fetch to the analytics backend.
 * Automatically handles JWT token refresh on 401.
 */
export async function analyticsApiFetch<T = any>(
  path: string,
  opts: FetchOptions = {}
): Promise<T> {
  const config = getAnalyticsConfig();
  const { method = "GET", body, params, useApiKey = false } = opts;

  // Build URL with query params
  let url = `${config.baseUrl}${path}`;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        sp.set(k, String(v));
      }
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (useApiKey) {
    if (!config.apiKey) throw new Error("[Analytics] LW_MACHINE_API_KEY is not configured");
    headers["X-API-Key"] = config.apiKey;
  } else {
    const token = await getValidToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOpts: RequestInit = { method, headers };
  if (body) fetchOpts.body = JSON.stringify(body);

  let res = await fetch(url, fetchOpts);

  // Auto-retry once on 401 (token expired)
  if (res.status === 401 && !useApiKey) {
    clearToken();
    const newToken = await getValidToken();
    headers["Authorization"] = `Bearer ${newToken}`;
    res = await fetch(url, { method, headers, body: fetchOpts.body });
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(
      `[Analytics] ${method} ${path} failed (${res.status}): ${JSON.stringify(errBody) || res.statusText}`
    );
  }

  return res.json();
}

// ============================================================================
// Dashboard Read APIs (Bearer token)
// ============================================================================

export interface DateRange {
  date_from: string; // YYYY-MM-DD
  date_to: string;   // YYYY-MM-DD
  machine_id?: string;
}

export interface PaginatedParams extends DateRange {
  page?: number;
  page_size?: number;
}

// 7.1 POS Summary
export async function getPosSummary(params: DateRange) {
  const config = getAnalyticsConfig();
  return analyticsApiFetch("/dashboard/posifly/summary", {
    params: {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id || config.machineId,
    },
  });
}

// 7.2 POS Bills
export async function getPosBills(params: PaginatedParams) {
  const config = getAnalyticsConfig();
  return analyticsApiFetch("/dashboard/posifly/bills", {
    params: {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id || config.machineId,
      page: params.page || 1,
      page_size: params.page_size || 50,
    },
  });
}

// 7.3 POS Items
export async function getPosItems(params: PaginatedParams) {
  const config = getAnalyticsConfig();
  return analyticsApiFetch("/dashboard/posifly/items", {
    params: {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id || config.machineId,
      page: params.page || 1,
      page_size: params.page_size || 50,
    },
  });
}

// 7.4 POS Payments
export async function getPosPayments(params: PaginatedParams) {
  const config = getAnalyticsConfig();
  return analyticsApiFetch("/dashboard/posifly/payments", {
    params: {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id || config.machineId,
      page: params.page || 1,
      page_size: params.page_size || 50,
    },
  });
}

// 7.5 POS Charges
export async function getPosCharges(params: PaginatedParams) {
  const config = getAnalyticsConfig();
  return analyticsApiFetch("/dashboard/posifly/charges", {
    params: {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id || config.machineId,
      page: params.page || 1,
      page_size: params.page_size || 50,
    },
  });
}

// 8. General Vending Dashboard APIs
export async function getDashboardSummary(params?: DateRange) {
  return analyticsApiFetch("/dashboard/summary", {
    params: params ? {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id,
    } : undefined,
  });
}

export async function getDashboardTransactions(params?: PaginatedParams) {
  return analyticsApiFetch("/dashboard/transactions", {
    params: params ? {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id,
      page: params.page || 1,
      page_size: params.page_size || 50,
    } : undefined,
  });
}

export async function getDashboardProductsSold(params?: PaginatedParams) {
  return analyticsApiFetch("/dashboard/products-sold", {
    params: params ? {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id,
    } : undefined,
  });
}

export async function getDashboardScans(params?: PaginatedParams) {
  return analyticsApiFetch("/dashboard/scans", {
    params: params ? {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id,
    } : undefined,
  });
}

export async function getDashboardTopProducts(params?: DateRange) {
  return analyticsApiFetch("/dashboard/top-products", {
    params: params ? {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id,
    } : undefined,
  });
}

export async function getDashboardRevenueTrend(params?: DateRange) {
  return analyticsApiFetch("/dashboard/revenue-trend", {
    params: params ? {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id,
    } : undefined,
  });
}

export async function getDashboardMachineStatus(params?: DateRange) {
  return analyticsApiFetch("/dashboard/machine-status", {
    params: params ? {
      date_from: params.date_from,
      date_to: params.date_to,
      machine_id: params.machine_id,
    } : undefined,
  });
}

// Machine CRUD
export async function getMachines() {
  return analyticsApiFetch("/dashboard/machines");
}

export async function createMachine(data: {
  machine_id: string;
  machine_name: string;
  location: string;
  version: "v1" | "v2";
  api_key: string;
}) {
  return analyticsApiFetch("/dashboard/machines", {
    method: "POST",
    body: data,
  });
}

export async function updateMachine(
  machineId: string,
  data: Partial<{
    machine_name: string;
    location: string;
    version: string;
    api_key: string;
  }>
) {
  return analyticsApiFetch(`/dashboard/machines/${machineId}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteMachine(machineId: string) {
  return analyticsApiFetch(`/dashboard/machines/${machineId}`, {
    method: "DELETE",
  });
}

// Auth management
export async function getAuthMe() {
  return analyticsApiFetch("/auth/me");
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return analyticsApiFetch("/auth/change-password", {
    method: "POST",
    body: { current_password: currentPassword, new_password: newPassword },
  });
}
