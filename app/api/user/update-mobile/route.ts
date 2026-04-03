import { NextRequest, NextResponse } from "next/server";
import { API_ROUTES } from "@/redux/routes/apiRoutes";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, phoneNumber, countryCode = "91" } = body;

    if (!userId || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: "userId and phoneNumber are required" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN;

    if (!apiUrl) {
      return NextResponse.json(
        { success: false, error: "API URL not configured" },
        { status: 500 }
      );
    }

    // Update user via Leafwater API (user/save acts as upsert)
    const response = await fetch(`${apiUrl}${API_ROUTES.SAVE_USER}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(dbToken ? { "x-db-token": dbToken } : {}),
      },
      body: JSON.stringify({
        _key: userId.replace("users/", ""),
        phoneNumber: (() => {
          const digits = phoneNumber.replace(/\D/g, "");
          // If already has country code prefix, strip it
          if (digits.startsWith(countryCode)) {
            return `+${countryCode}${digits.slice(countryCode.length)}`;
          }
          return `+${countryCode}${digits}`;
        })(),
        countryCode,
        isValidated: true,
      }),
    });

    const data = await response.json();

    if (response.ok && data?.status !== "failure") {
      return NextResponse.json({
        success: true,
        message: "Mobile number updated successfully",
        data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: data?.message || "Failed to update mobile number",
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[update-mobile] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
