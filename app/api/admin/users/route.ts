import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/admin-db';

// GET - Get all users or user count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';

    if (countOnly) {
      const count = adminDb.getUsersCount();
      return NextResponse.json({ count });
    }

    // Get dashboard stats which includes user count
    const stats = adminDb.getDashboardStats();
    return NextResponse.json({ 
      usersCount: stats.usersCount,
      stats 
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Save a user to local database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, phone, email } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const savedUserId = adminDb.saveUser(
      userId,
      name || '',
      phone || '',
      email || ''
    );

    console.log(`[API] Saved user to local DB: ${savedUserId}`);

    return NextResponse.json({ 
      success: true, 
      userId: savedUserId 
    });
  } catch (error) {
    console.error('Error saving user:', error);
    return NextResponse.json(
      { error: 'Failed to save user' },
      { status: 500 }
    );
  }
}
