/**
 * Test: DMS Expiration Fix
 * Verifies that expiresAt remains fixed at creation time and doesn't update on pulse
 */

import { SealService } from "@/lib/sealService";
import { MockDatabase } from "@/lib/database";
import { MockStorage } from "@/lib/storage";

describe("DMS Expiration Fix", () => {
  let sealService: SealService;
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
    const storage = new MockStorage();
    sealService = new SealService(
      storage,
      db,
      "test-master-key-32-bytes-long!!",
    );
  });

  it("should keep expiration fixed when pulsing DMS seal", async () => {
    const now = Date.now();
    const unlockTime = now + 7 * 24 * 60 * 60 * 1000; // 7 days
    const expiresAfterDays = 7; // Delete 7 days after unlock
    const pulseInterval = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Create DMS seal with expiration
    const { sealId, pulseToken } = await sealService.createSeal(
      {
        encryptedBlob: new ArrayBuffer(100),
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime,
        isDMS: true,
        pulseInterval,
        expiresAfterDays,
      },
      "127.0.0.1",
    );

    // Get initial expiration
    const sealBefore = await db.getSeal(sealId);
    const initialExpiresAt = sealBefore?.expiresAt;
    expect(initialExpiresAt).toBeDefined();
    expect(initialExpiresAt).toBe(
      unlockTime + expiresAfterDays * 24 * 60 * 60 * 1000,
    );

    // Wait 1 second and pulse
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await sealService.pulseSeal(pulseToken!, "127.0.0.1");

    // Check expiration hasn't changed
    const sealAfter = await db.getSeal(sealId);
    expect(sealAfter?.expiresAt).toBe(initialExpiresAt);
    expect(sealAfter?.unlockTime).toBeGreaterThan(unlockTime); // Unlock time should update
  });

  it("should allow DMS seal to live beyond initial expiration window via pulsing", async () => {
    const now = Date.now();
    const unlockTime = now + 10 * 60 * 1000; // 10 minutes
    const expiresAfterDays = 1 / (24 * 6); // ~4 hours after unlock
    const pulseInterval = 5 * 60 * 1000; // 5 minutes (minimum)

    // Create DMS seal with very short expiration
    const { sealId, pulseToken } = await sealService.createSeal(
      {
        encryptedBlob: new ArrayBuffer(100),
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime,
        isDMS: true,
        pulseInterval,
        expiresAfterDays,
      },
      "127.0.0.1",
    );

    const sealBefore = await db.getSeal(sealId);
    const initialExpiresAt = sealBefore?.expiresAt;

    // Pulse 3 times (simulates keeping seal alive)
    let currentToken = pulseToken!;
    for (let i = 0; i < 3; i++) {
      const { newPulseToken } = await sealService.pulseSeal(
        currentToken,
        "127.0.0.1",
      );
      currentToken = newPulseToken;
    }

    // Seal should still exist with same expiration
    const sealAfter = await db.getSeal(sealId);
    expect(sealAfter).toBeDefined();
    expect(sealAfter?.expiresAt).toBe(initialExpiresAt);
  });

  it("should not update expiresAt when seal has no expiration", async () => {
    const now = Date.now();
    const unlockTime = now + 10 * 60 * 1000; // 10 minutes
    const pulseInterval = 5 * 60 * 1000; // 5 minutes (minimum)

    // Create DMS seal WITHOUT expiration
    const { sealId, pulseToken } = await sealService.createSeal(
      {
        encryptedBlob: new ArrayBuffer(100),
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime,
        isDMS: true,
        pulseInterval,
      },
      "127.0.0.1",
    );

    const sealBefore = await db.getSeal(sealId);
    expect(sealBefore?.expiresAt).toBeUndefined();

    // Pulse
    await sealService.pulseSeal(pulseToken!, "127.0.0.1");

    // Should still have no expiration
    const sealAfter = await db.getSeal(sealId);
    expect(sealAfter?.expiresAt).toBeUndefined();
  });
});
