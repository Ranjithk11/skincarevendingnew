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

    if (typeof userId !== "string" || userId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "Missing userId" } },
        { status: 400 }
      );
    }

    const normalizedUserId = userId.includes("/") ? userId : `users/${userId}`;

    const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        { success: false, error: { message: "Missing NEXT_PUBLIC_API_URL" } },
        { status: 500 }
      );
    }

    // Call the backend feedback API
    const headers = {
      "Content-Type": "application/json",
      ...(dbToken ? { "x-db-token": dbToken } : {}),
    };

    const send = async (payload: any) => {
      const response = await fetch(`${apiUrl}/feedback/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const rawText = await response.text().catch(() => "");
      const result = (() => {
        try {
          return rawText ? JSON.parse(rawText) : null;
        } catch {
          return null;
        }
      })();

      return { response, rawText, result };
    };

    const ratingInt = Math.round(Number(rating));
    const notesStr = typeof notes === "string" ? notes : "";

    let attempt = await send({ userId: normalizedUserId, rating: ratingInt, notes: notesStr });

    const schemaFailed =
      typeof attempt.rawText === "string" &&
      attempt.rawText.toLowerCase().includes("schema validation failed");

    if (!attempt.response.ok && schemaFailed) {
      const userIdRaw = typeof userId === "string" ? userId.trim() : "";
      attempt = await send({ userId: userIdRaw, rating: ratingInt, notes: notesStr });
    }

    if (!attempt.response.ok && schemaFailed) {
      const userIdRaw = typeof userId === "string" ? userId.trim() : "";
      attempt = await send({ user_id: userIdRaw, rating: ratingInt, comment: notesStr });
    }

    const { response, rawText, result } = attempt;

    if (response.ok && result?.status === "success") {
      return NextResponse.json({
        success: true,
        data: result.data,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            message:
              result?.message ||
              (rawText ? `Failed to submit feedback (${response.status}): ${rawText}` : "Failed to submit feedback"),
          },
        },
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
