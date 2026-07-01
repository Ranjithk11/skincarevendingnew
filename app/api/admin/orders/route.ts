import { NextRequest, NextResponse } from 'next/server';
import {
  createRazorpayClient,
  resolveRazorpayPaymentId,
  type RazorpayMode,
} from '@/lib/razorpayPaymentResolve';

// GET /api/admin/orders - List all orders
export async function GET(request: NextRequest) {
  try {
    const { adminDb } = await import('@/lib/admin-db');
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
    const { adminDb } = await import('@/lib/admin-db');
    const body = await request.json();
    const {
      userId,
      items,
      totalAmount,
      paymentId,
      qrCodeId,
      razorpayOrderId,
      paymentMode,
    } = body;

    let resolvedPaymentId = typeof paymentId === 'string' ? paymentId.trim() : '';

    if (!resolvedPaymentId && (qrCodeId || razorpayOrderId)) {
      const mode = (paymentMode === 'live' ? 'live' : 'test') as RazorpayMode;
      const razorpay = createRazorpayClient(mode);
      if (razorpay) {
        const resolved = await resolveRazorpayPaymentId(
          razorpay,
          { qrCodeId, orderId: razorpayOrderId },
          5
        );
        resolvedPaymentId = resolved.paymentId;
        if (resolved.paymentId) {
          console.log('[Orders API] Resolved paymentId:', resolved.paymentId);
        } else {
          console.warn('[Orders API] Could not resolve paymentId for order', razorpayOrderId);
        }
      }
    }

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

    if (resolvedPaymentId) {
      const existing = adminDb.getOrderByPaymentId(resolvedPaymentId);
      if (existing) {
        console.log('[Orders API] Duplicate request ignored for paymentId:', resolvedPaymentId, existing.id);
        return NextResponse.json({
          success: true,
          order: existing,
          duplicate: true,
        });
      }
    }

    if (razorpayOrderId) {
      const existing = adminDb.getOrderByRazorpayOrderId(String(razorpayOrderId).trim());
      if (existing) {
        console.log('[Orders API] Duplicate request ignored for razorpayOrderId:', razorpayOrderId, existing.id);
        return NextResponse.json({
          success: true,
          order: existing,
          duplicate: true,
        });
      }
    }

    const order = adminDb.createOrder({
      userId,
      items,
      totalAmount,
      paymentId: resolvedPaymentId || undefined,
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
