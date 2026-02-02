import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, rating, notes } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid rating. Must be between 1 and 5." } },
        { status: 400 }
      );
    }

    const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    // Call the backend feedback API
    const response = await fetch(`${apiUrl}/feedback/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(dbToken ? { "x-db-token": dbToken } : {}),
      },
      body: JSON.stringify({
        userId: userId || "",
        rating: Number(rating),
        notes: notes || "",
      }),
    });

    const result = await response.json();

    if (result.status === "success") {
      return NextResponse.json({
        success: true,
        data: result.data,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: { message: result.message || "Failed to submit feedback" } },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error?.message || "Failed to submit feedback",
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "35";
    const userId = searchParams.get("userId") || "";

    const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(userId ? { userId } : {}),
    });

    const response = await fetch(`${apiUrl}/feedback/list?${queryParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(dbToken ? { "x-db-token": dbToken } : {}),
      },
    });

    const result = await response.json();

    return NextResponse.json({
      success: result.status === "success",
      data: result.data,
      totalCounts: result.totalCounts,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Feedback fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error?.message || "Failed to fetch feedback",
        },
      },
      { status: 500 }
    );
  }
}
