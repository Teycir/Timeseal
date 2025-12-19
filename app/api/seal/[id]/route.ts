import { NextRequest, NextResponse } from 'next/server';
import { Database, createMockDB } from '@/lib/database';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sealId = params.id;
    
    // Initialize database
    const db = new Database(createMockDB());
    
    // Get seal from database
    const seal = await db.getSeal(sealId);
    
    if (!seal) {
      return NextResponse.json(
        { error: 'Seal not found' },
        { status: 404 }
      );
    }

    const now = Date.now();
    const isLocked = now < seal.unlockTime;

    if (isLocked) {
      // Return locked status with countdown info
      return NextResponse.json({
        id: sealId,
        isLocked: true,
        unlockTime: seal.unlockTime,
        timeRemaining: seal.unlockTime - now,
      });
    }

    // Time has passed - release Key B
    return NextResponse.json({
      id: sealId,
      isLocked: false,
      unlockTime: seal.unlockTime,
      keyB: seal.keyB,
      iv: seal.iv,
    });

  } catch (error) {
    console.error('Error fetching seal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seal' },
      { status: 500 }
    );
  }
}