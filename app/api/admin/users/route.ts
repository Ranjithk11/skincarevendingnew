import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const IS_VERCEL = process.env.VERCEL === "1";

async function getAdminDb() {
  const { adminDb } = await import("@/lib/admin-db");
  return adminDb;
}

// GET - Get all users or user count
export async function GET(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ usersCount: 0, stats: { usersCount: 0 } });
  }

  try {
    const adminDb = await getAdminDb();
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("countOnly") === "true";

    if (countOnly) {
      const count = adminDb.getUsersCount();
      return NextResponse.json({ count });
    }

    const stats = adminDb.getDashboardStats();
    return NextResponse.json({
      usersCount: stats.usersCount,
      stats,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST - Save a user to local database (kiosk only — skipped on Vercel)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, phone, email } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (IS_VERCEL) {
      return NextResponse.json({
        success: true,
        skipped: true,
        userId,
        message: "Local SQLite unavailable on Vercel — user registered via auth API only.",
      });
    }

    const adminDb = await getAdminDb();
    const savedUserId = adminDb.saveUser(
      userId,
      name || "",
      phone || "",
      email || ""
    );

    console.log(`[API] Saved user to local DB: ${savedUserId}`);

    return NextResponse.json({
      success: true,
      userId: savedUserId,
    });
  } catch (error) {
    console.error("Error saving user:", error);
    return NextResponse.json({ error: "Failed to save user" }, { status: 500 });
  }
}
