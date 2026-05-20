import { NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// GET /api/admin/orders/stats - Get sales statistics
export async function GET() {
  try {
    const { adminDb } = await import('@/lib/admin-db');
    const stats = adminDb.getSalesStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sales stats' },
      { status: 500 }
    );
  }
}
