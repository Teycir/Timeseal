import { NextRequest, NextResponse } from 'next/server';
import { Database, createMockDB } from '@/lib/database';

export const runtime = 'edge';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const pulseToken = params.token;
    
    // Initialize database
    const db = new Database(createMockDB());
    
    // Find seal by pulse token
    const seal = await db.getSeal(''); // Mock - would query by pulse_token
    
    if (!seal || !seal.pulseToken || seal.pulseToken !== pulseToken) {
      return NextResponse.json(
        { error: 'Invalid pulse token' },
        { status: 404 }
      );
    }

    if (!seal.pulseDuration) {
      return NextResponse.json(
        { error: 'Seal is not configured for pulse updates' },
        { status: 400 }
      );
    }

    // Extend unlock time
    const newUnlockTime = Date.now() + seal.pulseDuration;
    const success = await db.updateUnlockTime(pulseToken, newUnlockTime);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update pulse' },
        { status: 500 }
      );
    }

    // In production, extend R2 Object Lock retention period
    console.log(`[MOCK R2] Extended retention for seal until ${new Date(newUnlockTime)}`);

    return NextResponse.json({
      success: true,
      newUnlockTime,
      message: 'Pulse updated successfully',
    });

  } catch (error) {
    console.error('Error updating pulse:', error);
    return NextResponse.json(
      { error: 'Failed to update pulse' },
      { status: 500 }
    );
  }
}