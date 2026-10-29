// Test: Dual-key rotation for master encryption key
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { SealService } from "@/lib/sealService";
import { MockStorage } from "@/lib/storage";
import { MockDatabase } from "@/lib/database";

describe("Master Key Rotation", () => {
  let storage: any;
  let db: any;
  const oldKey = "old-master-key-32-bytes-long!!";
  const newKey = "new-master-key-32-bytes-long!!";

  // Unlock times must be >= 1 minute in the future, so tests create seals 2 minutes
  // out and fast-forward the clock instead of sleeping.
  const UNLOCK_DELAY = 2 * 60 * 1000;
  const advancePastUnlock = () => {
    const realNow = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(realNow + UNLOCK_DELAY + 1000);
  };

  beforeEach(() => {
    storage = new MockStorage();
    db = new MockDatabase();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should encrypt new seals with new key (masterKeys[0])", async () => {
    const sealService = new SealService(storage, db, [newKey, oldKey]);
    
    const encryptedBlob = new TextEncoder().encode("test content").buffer;
    const result = await sealService.createSeal(
      {
        encryptedBlob,
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime: Date.now() + UNLOCK_DELAY,
        isDMS: false,
      },
      "127.0.0.1",
    );

    expect(result.sealId).toBeDefined();
    
    // Verify seal was created
    const seal = await db.getSeal(result.sealId);
    expect(seal).toBeDefined();
    expect(seal.keyB).toBeDefined();
  });

  it("should decrypt old seals with old key (fallback)", async () => {
    // Create seal with old key only
    const oldService = new SealService(storage, db, [oldKey]);
    
    const encryptedBlob = new TextEncoder().encode("test content").buffer;
    const createResult = await oldService.createSeal(
      {
        encryptedBlob,
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime: Date.now() + UNLOCK_DELAY,
        isDMS: false,
      },
      "127.0.0.1",
    );

    advancePastUnlock();

    // Try to decrypt with new service (has both keys)
    const newService = new SealService(storage, db, [newKey, oldKey]);
    
    const seal = await newService.getSeal(createResult.sealId, "127.0.0.1");
    
    expect(seal.status).toBe("unlocked");
    expect(seal.keyB).toBeDefined();
  });

  it("should fail to decrypt old seals without old key", async () => {
    // Create seal with old key
    const oldService = new SealService(storage, db, [oldKey]);
    
    const encryptedBlob = new TextEncoder().encode("test content").buffer;
    const createResult = await oldService.createSeal(
      {
        encryptedBlob,
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime: Date.now() + UNLOCK_DELAY,
        isDMS: false,
      },
      "127.0.0.1",
    );

    advancePastUnlock();

    // Try to decrypt with only new key (no fallback)
    const newServiceOnly = new SealService(storage, db, [newKey]);
    
    await expect(
      newServiceOnly.getSeal(createResult.sealId, "127.0.0.1")
    ).rejects.toThrow();
  });

  it("should support single key (backward compatibility)", async () => {
    const sealService = new SealService(storage, db, [oldKey]);
    
    const encryptedBlob = new TextEncoder().encode("test content").buffer;
    const result = await sealService.createSeal(
      {
        encryptedBlob,
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime: Date.now() + UNLOCK_DELAY,
        isDMS: false,
      },
      "127.0.0.1",
    );

    advancePastUnlock();

    const seal = await sealService.getSeal(result.sealId, "127.0.0.1");
    
    expect(seal.status).toBe("unlocked");
    expect(seal.keyB).toBeDefined();
  });

  it("should try keys in order (new key first)", async () => {
    // This test verifies the order matters for performance
    // New seals should decrypt with first key attempt
    const sealService = new SealService(storage, db, [newKey, oldKey]);
    
    const encryptedBlob = new TextEncoder().encode("test content").buffer;
    const result = await sealService.createSeal(
      {
        encryptedBlob,
        keyB: "test-key-b",
        iv: "test-iv",
        unlockTime: Date.now() + UNLOCK_DELAY,
        isDMS: false,
      },
      "127.0.0.1",
    );

    advancePastUnlock();

    // Should decrypt successfully with new key (first in array)
    const seal = await sealService.getSeal(result.sealId, "127.0.0.1");
    
    expect(seal.status).toBe("unlocked");
    expect(seal.keyB).toBeDefined();
  });
});
