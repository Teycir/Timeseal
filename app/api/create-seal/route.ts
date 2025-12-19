import { NextRequest, NextResponse } from 'next/server';
import { Database, createMockDB } from '@/lib/database';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const encryptedBlob = formData.get('encryptedBlob') as File;
    const keyB = formData.get('keyB') as string;
    const iv = formData.get('iv') as string;
    const unlockTime = parseInt(formData.get('unlockTime') as string);
    const pulseToken = formData.get('pulseToken') as string | null;
    const pulseDuration = formData.get('pulseDuration') ? 
      parseInt(formData.get('pulseDuration') as string) : null;

    if (!encryptedBlob || !keyB || !iv || !unlockTime || isNaN(unlockTime)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize database (use env.DB in production with Cloudflare Workers)
    const db = new Database(createMockDB());
    
    // Create seal record
    const sealId = await db.createSeal({
      id: '', // Will be generated
      keyB,
      iv,
      unlockTime,
      pulseToken: pulseToken || undefined,
      pulseDuration: pulseDuration || undefined,
      isActive: true,
    });

    // In production, upload to R2 with Object Lock
    // For now, we'll simulate the R2 upload
    await encryptedBlob.arrayBuffer();
    
    // Mock R2 upload with WORM compliance
    // In production: 
    // await env.R2.put(`seals/${sealId}`, blobBuffer, {
    //   httpMetadata: {
    //     contentType: 'application/octet-stream',
    //   },
    //   customMetadata: {
    //     'retention-until': new Date(unlockTime).toISOString(),
    //   }
    // });

    console.log(`[MOCK R2] Uploaded seal ${sealId} with retention until ${new Date(unlockTime)}`);
    console.log(`[MOCK R2] Object Lock enabled - undeletable until unlock time`);

    return NextResponse.json({
      success: true,
      sealId,
      publicUrl: `/v/${sealId}`,
      pulseUrl: pulseToken ? `/pulse/${pulseToken}` : null,
    });

  } catch (error) {
    console.error('Error creating seal:', error);
    return NextResponse.json(
      { error: 'Failed to create seal' },
      { status: 500 }
    );
  }
}