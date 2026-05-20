import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/orders/[orderId] - Get a specific order
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { adminDb } = await import('@/lib/admin-db');
    const order = adminDb.getOrder(params.orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/orders/[orderId] - Update order (e.g., mark as completed, update dispense status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { adminDb } = await import('@/lib/admin-db');
    const body = await request.json();
    const { status, productId, dispensed, dispenseError } = body;

    let order;

    // If updating a specific item's dispense status
    if (productId !== undefined && dispensed !== undefined) {
      order = adminDb.updateOrderItemDispenseStatus(
        params.orderId,
        productId,
        dispensed,
        dispenseError
      );
    } 
    // If just updating the order status
    else if (status) {
      order = adminDb.updateOrder(params.orderId, { status });
    }
    // Complete the order
    else if (body.complete) {
      order = adminDb.completeOrder(params.orderId);
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update order' },
      { status: 500 }
    );
  }
}
