import { describe, test, expect, beforeEach } from "@jest/globals";
import {
  validateEphemeralConfig,
  isEphemeralExhausted,
  getRemainingViews,
  getEphemeralStatus,
} from "../../lib/ephemeral";
import { SealDatabase } from "../../lib/database";
import { SealService } from "../../lib/sealService";
import { createStorage } from "../../lib/storage";
import { AuditLogger } from "../../lib/auditLogger";

describe("Ephemeral Seals", () => {
  let db: any;
  let storage: any;
  let auditLogger: any;
  let sealService: SealService;
  const masterKey = "test-master-key-32-bytes-long!!";

  beforeEach(() => {
    db = {
      getSeal: jest.fn(),
      createSeal: jest.fn(),
      updateSeal: jest.fn(),
      deleteSeal: jest.fn(),
    };
    storage = {
      uploadBlob: jest.fn().mockResolvedValue(undefined),
      storeBlob: jest.fn(),
      getBlob: jest.fn(),
      deleteBlob: jest.fn(),
    };
    auditLogger = {
      log: jest.fn(),
    };
    sealService = new SealService(storage, db, masterKey, auditLogger);
  });

  describe("validateEphemeralConfig", () => {
    test("validates non-ephemeral config", () => {
      const result = validateEphemeralConfig({
        isEphemeral: false,
        maxViews: null,
      });
      expect(result.valid).toBe(true);
    });

    test("validates ephemeral with null maxViews", () => {
      const result = validateEphemeralConfig({
        isEphemeral: true,
        maxViews: null,
      });
      expect(result.valid).toBe(true);
    });

    test("validates ephemeral with valid maxViews", () => {
      const result = validateEphemeralConfig({
        isEphemeral: true,
        maxViews: 5,
      });
      expect(result.valid).toBe(true);
    });

    test("rejects maxViews < 1", () => {
      const result = validateEphemeralConfig({
        isEphemeral: true,
        maxViews: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be between 1 and 100");
    });

    test("rejects maxViews > 100", () => {
      const result = validateEphemeralConfig({
        isEphemeral: true,
        maxViews: 101,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be between 1 and 100");
    });

    test("rejects non-integer maxViews", () => {
      const result = validateEphemeralConfig({
        isEphemeral: true,
        maxViews: 3.5,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("isEphemeralExhausted", () => {
    test("returns false for non-ephemeral seals", () => {
      expect(isEphemeralExhausted(false, 5, 3)).toBe(false);
    });

    test("returns false for ephemeral with null maxViews", () => {
      expect(isEphemeralExhausted(true, 100, null)).toBe(false);
    });

    test("returns false when views < maxViews", () => {
      expect(isEphemeralExhausted(true, 2, 5)).toBe(false);
    });

    test("returns true when views >= maxViews", () => {
      expect(isEphemeralExhausted(true, 5, 5)).toBe(true);
      expect(isEphemeralExhausted(true, 6, 5)).toBe(true);
    });
  });

  describe("getRemainingViews", () => {
    test("returns null for non-ephemeral seals", () => {
      expect(getRemainingViews(false, 3, 5)).toBeNull();
    });

    test("returns null for ephemeral with null maxViews", () => {
      expect(getRemainingViews(true, 3, null)).toBeNull();
    });

    test("calculates remaining views correctly", () => {
      expect(getRemainingViews(true, 2, 5)).toBe(3);
      expect(getRemainingViews(true, 5, 5)).toBe(0);
    });

    test("returns 0 when exhausted", () => {
      expect(getRemainingViews(true, 6, 5)).toBe(0);
    });
  });

  describe("getEphemeralStatus", () => {
    test("returns correct status for non-exhausted seal", () => {
      const status = getEphemeralStatus(true, 2, 5, 1234567890);
      expect(status.isExhausted).toBe(false);
      expect(status.viewCount).toBe(2);
      expect(status.maxViews).toBe(5);
      expect(status.remainingViews).toBe(3);
      expect(status.firstViewedAt).toBe(1234567890);
    });

    test("returns correct status for exhausted seal", () => {
      const status = getEphemeralStatus(true, 5, 5, 1234567890);
      expect(status.isExhausted).toBe(true);
      expect(status.remainingViews).toBe(0);
    });
  });

  describe("SealService integration", () => {
    test("creates ephemeral seal with maxViews", async () => {
      const unlockTime = Date.now() + 120000; // 2 minutes in future
      const blob = new TextEncoder().encode("test content");
      const sealId = "test-seal-id";

      db.createSeal.mockResolvedValue({ sealId });
      db.getSeal.mockResolvedValue({
        id: sealId,
        isEphemeral: true,
        maxViews: 1,
        viewCount: 0,
      });

      const result = await sealService.createSeal(
        {
          encryptedBlob: blob.buffer,
          keyB: "test-key-b",
          iv: "test-iv",
          unlockTime,
          isEphemeral: true,
          maxViews: 1,
        },
        "127.0.0.1",
      );

      expect(result.sealId).toBeDefined();
      expect(db.createSeal).toHaveBeenCalled();
    });

    test("non-ephemeral seals work normally", async () => {
      const unlockTime = Date.now() + 120000; // 2 minutes in future
      const blob = new TextEncoder().encode("test content");
      const sealId = "test-seal-id";

      db.createSeal.mockResolvedValue({ sealId });
      db.getSeal.mockResolvedValue({
        id: sealId,
        isEphemeral: false,
        unlockTime,
        keyB: "test-key-b",
        iv: "test-iv",
      });
      storage.getBlob.mockResolvedValue(blob.buffer);

      const result = await sealService.createSeal(
        {
          encryptedBlob: blob.buffer,
          keyB: "test-key-b",
          iv: "test-iv",
          unlockTime,
          isEphemeral: false,
        },
        "127.0.0.1",
      );

      expect(result.sealId).toBeDefined();
    });
  });
});
