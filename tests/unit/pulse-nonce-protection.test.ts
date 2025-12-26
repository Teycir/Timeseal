// Test: Operation-specific nonce protection for pulse operations
import { describe, it, expect, beforeEach } from "@jest/globals";
import { SealService } from "@/lib/sealService";
import { MockStorage } from "@/lib/storage";
import { MockDatabase } from "@/lib/database";

describe("Pulse Operation Nonce Protection", () => {
  let sealService: SealService;
  let db: any;
  let storage: any;
  const masterKey = "test-master-key-32-bytes-long!!";

  beforeEach(async () => {
    db = new MockDatabase();
    storage = new MockStorage();
    sealService = new SealService(storage, db, masterKey);
  });

  it("should allow pulse renewal with valid operation nonce", async () => {
    // Create DMS seal
    const encryptedBlob = new TextEncoder().encode("test content").buffer;
    const result = await sealService.createSeal(
      {
        encryptedBlob,
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime: Date.now() + 86400000,
        isDMS: true,
        pulseInterval: 86400000,
      },
      "127.0.0.1",
    );

    expect(result.pulseToken).toBeDefined();

    // Mock seal exists
    const mockSeal = {
      id: result.sealId,
      unlockTime: Date.now() + 86400000,
      isDMS: true,
      pulseInterval: 86400000,
      createdAt: Date.now(),
      keyB: "encrypted-key-b",
      iv: "test-iv",
      pulseToken: result.pulseToken,
      blobHash: "test-hash",
      isEphemeral: false,
      viewCount: 0,
      maxViews: null,
      accessCount: 0,
    };

    db.getSeal = async () => mockSeal;
    db.updatePulseAndUnlockTime = async () => {};
    db.storeNonce = async () => true; // First use succeeds

    const operationNonce = crypto.randomUUID();
    const pulseResult = await sealService.pulseSeal(
      result.pulseToken ?? "",
      "127.0.0.1",
      86400000,
      operationNonce,
    );

    expect(pulseResult.newUnlockTime).toBeGreaterThan(Date.now());
    expect(pulseResult.newPulseToken).toBeDefined();
  });

  it("should reject replay attack with same operation nonce", async () => {
    // Create DMS seal
    const encryptedBlob = new TextEncoder().encode("test content").buffer;
    const result = await sealService.createSeal(
      {
        encryptedBlob,
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime: Date.now() + 86400000,
        isDMS: true,
        pulseInterval: 86400000,
      },
      "127.0.0.1",
    );

    const mockSeal = {
      id: result.sealId,
      unlockTime: Date.now() + 86400000,
      isDMS: true,
      pulseInterval: 86400000,
      createdAt: Date.now(),
      keyB: "encrypted-key-b",
      iv: "test-iv",
      pulseToken: result.pulseToken,
      blobHash: "test-hash",
      isEphemeral: false,
      viewCount: 0,
      maxViews: null,
      accessCount: 0,
    };

    db.getSeal = async () => mockSeal;
    db.updatePulseAndUnlockTime = async () => {};

    const operationNonce = crypto.randomUUID();

    // First use: nonce accepted
    db.storeNonce = async () => true;
    await sealService.pulseSeal(
      result.pulseToken ?? "",
      "127.0.0.1",
      86400000,
      operationNonce,
    );

    // Second use: nonce rejected (replay detected)
    db.storeNonce = async () => false;
    await expect(
      sealService.pulseSeal(
        result.pulseToken ?? "",
        "127.0.0.1",
        86400000,
        operationNonce,
      ),
    ).rejects.toThrow("Operation already processed");
  });

  it("should allow multiple renewals with different operation nonces", async () => {
    // Create DMS seal
    const encryptedBlob = new TextEncoder().encode("test content").buffer;
    const result = await sealService.createSeal(
      {
        encryptedBlob,
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime: Date.now() + 86400000,
        isDMS: true,
        pulseInterval: 86400000,
      },
      "127.0.0.1",
    );

    const mockSeal = {
      id: result.sealId,
      unlockTime: Date.now() + 86400000,
      isDMS: true,
      pulseInterval: 86400000,
      createdAt: Date.now(),
      keyB: "encrypted-key-b",
      iv: "test-iv",
      pulseToken: result.pulseToken,
      blobHash: "test-hash",
      isEphemeral: false,
      viewCount: 0,
      maxViews: null,
      accessCount: 0,
    };

    db.getSeal = async () => mockSeal;
    db.updatePulseAndUnlockTime = async () => {};
    db.storeNonce = async () => true; // All nonces accepted (different)

    // First renewal
    const nonce1 = crypto.randomUUID();
    const result1 = await sealService.pulseSeal(
      result.pulseToken ?? "",
      "127.0.0.1",
      86400000,
      nonce1,
    );
    expect(result1.newPulseToken).toBeDefined();

    // Second renewal with different nonce
    const nonce2 = crypto.randomUUID();
    const result2 = await sealService.pulseSeal(
      result.pulseToken ?? "",
      "127.0.0.1",
      86400000,
      nonce2,
    );
    expect(result2.newPulseToken).toBeDefined();

    expect(nonce1).not.toBe(nonce2);
  });

  it("should work without operation nonce (backward compatibility)", async () => {
    // Create DMS seal
    const encryptedBlob = new TextEncoder().encode("test content").buffer;
    const result = await sealService.createSeal(
      {
        encryptedBlob,
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime: Date.now() + 86400000,
        isDMS: true,
        pulseInterval: 86400000,
      },
      "127.0.0.1",
    );

    const mockSeal = {
      id: result.sealId,
      unlockTime: Date.now() + 86400000,
      isDMS: true,
      pulseInterval: 86400000,
      createdAt: Date.now(),
      keyB: "encrypted-key-b",
      iv: "test-iv",
      pulseToken: result.pulseToken,
      blobHash: "test-hash",
      isEphemeral: false,
      viewCount: 0,
      maxViews: null,
      accessCount: 0,
    };

    db.getSeal = async () => mockSeal;
    db.updatePulseAndUnlockTime = async () => {};

    // No operation nonce provided
    const pulseResult = await sealService.pulseSeal(
      result.pulseToken ?? "",
      "127.0.0.1",
      86400000,
    );

    expect(pulseResult.newUnlockTime).toBeGreaterThan(Date.now());
    expect(pulseResult.newPulseToken).toBeDefined();
  });
});
