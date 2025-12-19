import { NextRequest, NextResponse } from 'next/server';
import { Database, createMockDB } from '@/lib/database';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sealId } = await params;

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

    // Time has passed - release Key B and Blob

    // Fetch blob from mock storage
    const { getMockBlob } = await import('@/lib/database');
    const blob = getMockBlob(sealId);

    // Convert blob to base64 for transport (prototype only)
    let blobBase64 = '';
    if (blob) {
      const bytes = new Uint8Array(blob);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      blobBase64 = btoa(binary);
    }

    return NextResponse.json({
      id: sealId,
      isLocked: false,
      unlockTime: seal.unlockTime,
      keyB: seal.keyB,
      iv: seal.iv,
      encryptedBlob: blobBase64,
    });

  } catch (error) {
    console.error('Error fetching seal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seal' },
      { status: 500 }
    );
  }
}