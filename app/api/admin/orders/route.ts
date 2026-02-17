import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/admin-db';

// GET /api/admin/orders - List all orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    const status = searchParams.get('status') as 'pending' | 'completed' | 'failed' | 'partial' | null;

    let result;
    if (status) {
      const orders = adminDb.getOrdersByStatus(status);
      result = { orders, total: orders.length };
    } else {
      result = adminDb.getAllOrders(limit, offset);
    }

    return NextResponse.json({
      success: true,
      orders: result.orders,
      total: result.total,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/admin/orders - Create a new order (called after payment success)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, items, totalAmount, paymentId, razorpayOrderId, paymentMode } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Items are required' },
        { status: 400 }
      );
    }

    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid totalAmount is required' },
        { status: 400 }
      );
    }

    const order = adminDb.createOrder({
      userId,
      items,
      totalAmount,
      paymentId,
      razorpayOrderId,
      paymentMode: paymentMode || 'test',
    });

    console.log('[Orders API] Created order:', order.id);

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create order' },
      { status: 500 }
    );
  }
}
