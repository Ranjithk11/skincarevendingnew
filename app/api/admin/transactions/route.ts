import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/admin-db';

// POST - Create a transaction record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, userId, productId, amount, paymentId, status } = body;

    if (!transactionId || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'transactionId and amount are required' },
        { status: 400 }
      );
    }

    adminDb.createTransaction(
      transactionId,
      userId || null,
      productId || null,
      amount,
      paymentId
    );

    if (status) {
      adminDb.updateTransactionStatus(transactionId, status, paymentId);
    }

    console.log(`[API] Created transaction: ${transactionId}`);

    return NextResponse.json({ 
      success: true, 
      transactionId 
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

// PATCH - Update transaction status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, status, paymentId } = body;

    if (!transactionId || !status) {
      return NextResponse.json(
        { error: 'transactionId and status are required' },
        { status: 400 }
      );
    }

    adminDb.updateTransactionStatus(transactionId, status, paymentId);

    console.log(`[API] Updated transaction ${transactionId} to ${status}`);

    return NextResponse.json({ 
      success: true, 
      transactionId,
      status 
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}
