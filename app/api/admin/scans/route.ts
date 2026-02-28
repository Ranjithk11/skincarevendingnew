import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/admin-db';

// GET - Get scan records count or list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';

    if (countOnly) {
      const count = adminDb.getScansCount();
      return NextResponse.json({ count });
    }

    const stats = adminDb.getDashboardStats();
    return NextResponse.json({ 
      scansCount: stats.scansCount,
      todayScans: stats.todayScans,
      stats 
    });
  } catch (error) {
    console.error('Error fetching scans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scans' },
      { status: 500 }
    );
  }
}

// POST - Save a scan record to local database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      imageUrl,
      localCapturedImage,
      skinType,
      detectedAttributes,
      detectedLipAttributes,
      analysisAiSummary,
      lipAnalysisSummary,
      dietPlan,
      capturedImages,
      analysedImages,
      publicUrl,
      recommendedProducts,
      recommendedLipProducts,
      recommendedSalonServices,
      recommendedCosmeticServices,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const scanId = adminDb.saveScanRecord({
      userId,
      imageUrl,
      localCapturedImage,
      skinType,
      detectedAttributes,
      detectedLipAttributes,
      analysisAiSummary,
      lipAnalysisSummary,
      dietPlan,
      capturedImages,
      analysedImages,
      publicUrl,
      recommendedProducts,
      recommendedLipProducts,
      recommendedSalonServices,
      recommendedCosmeticServices,
    });

    console.log(`[API] Saved scan record to local DB: ${scanId}`);

    return NextResponse.json({ 
      success: true, 
      scanId 
    });
  } catch (error) {
    console.error('Error saving scan record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to save scan record', details: errorMessage },
      { status: 500 }
    );
  }
}
