import { NextRequest, NextResponse } from "next/server";

const ADMIN_CREDENTIALS = [
  { username: "admin", password: "admin123" },
  { username: "Admin", password: "admin123" },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username and password are required" },
        { status: 400 }
      );
    }

    const isValid = ADMIN_CREDENTIALS.some(
      (cred) =>
        cred.username.toLowerCase() === username.toLowerCase() &&
        cred.password === password
    );

    if (isValid) {
      const response = NextResponse.json({
        success: true,
        message: "Login successful",
        user: { username },
      });

      // Set a cookie for session management
      response.cookies.set("admin_session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: "Invalid credentials" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
