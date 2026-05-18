import { NextRequest, NextResponse } from "next/server";
import { login, clearToken } from "@/lib/analytics-api";

/**
 * POST /api/analytics/login
 *
 * Proxy login to the LW Analytics backend.
 * Returns the JWT access_token for dashboard API calls.
 *
 * Request JSON: { username: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "username and password are required" },
        { status: 400 }
      );
    }

    const data = await login(username, password);

    return NextResponse.json({
      success: true,
      access_token: data.access_token,
      token_type: data.token_type,
      username: data.username,
      role: data.role,
    });
  } catch (error: any) {
    console.error("[Analytics Login] Error:", error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Login failed" },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/analytics/login
 *
 * Clear the cached analytics token (logout).
 */
export async function DELETE() {
  clearToken();
  return NextResponse.json({ success: true, message: "Token cleared" });
}
