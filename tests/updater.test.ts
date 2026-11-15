import { describe, it, expect, beforeEach } from "vitest";
import {
  compareSemver,
  formatBytes,
  formatReleaseDate,
  dismissUpdate,
  isUpdateDismissed,
  CURRENT_APP_VERSION,
} from "../src/services/updater";

describe("Updater Service", () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
    // Polyfill global localStorage for Node/Vitest
    globalThis.localStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        for (const key in mockStorage) {
          delete mockStorage[key];
        }
      },
      length: Object.keys(mockStorage).length,
      key: (i: number) => Object.keys(mockStorage)[i] ?? null,
    };
  });

  describe("compareSemver", () => {
    it("detects when latest version is newer", () => {
      expect(compareSemver("0.1.0", "0.1.1")).toBe(1);
      expect(compareSemver("0.1.0", "v0.1.1")).toBe(1);
      expect(compareSemver("0.1.0", "0.2.0")).toBe(1);
      expect(compareSemver("0.1.0", "1.0.0")).toBe(1);
    });

    it("detects when current version is equal or newer", () => {
      expect(compareSemver("0.1.0", "0.1.0")).toBe(0);
      expect(compareSemver("0.1.0", "v0.1.0")).toBe(0);
      expect(compareSemver("0.1.1", "0.1.0")).toBe(-1);
      expect(compareSemver("1.0.0", "0.9.9")).toBe(-1);
    });

    it("handles multi-digit version numbers accurately", () => {
      expect(compareSemver("0.1.9", "0.1.10")).toBe(1);
      expect(compareSemver("0.1.10", "0.1.9")).toBe(-1);
    });

    it("handles pre-release tags gracefully", () => {
      expect(compareSemver("0.1.0", "v0.1.1-beta")).toBe(1);
      expect(compareSemver("0.1.0", "v0.1.0-alpha")).toBe(0);
    });
  });

  describe("formatBytes", () => {
    it("formats byte values into megabytes", () => {
      expect(formatBytes(51201518)).toBe("48.8 MB");
      expect(formatBytes(1048576)).toBe("1.0 MB");
      expect(formatBytes(undefined)).toBe("");
      expect(formatBytes(0)).toBe("");
    });
  });

  describe("formatReleaseDate", () => {
    it("formats ISO date string", () => {
      const formatted = formatReleaseDate("2026-11-15T19:57:57Z");
      expect(formatted).toContain("2026");
      expect(formatted).toContain("Nov");
    });

    it("handles invalid date gracefully", () => {
      expect(formatReleaseDate("not-a-date")).toBe("");
    });
  });

  describe("dismissUpdate", () => {
    it("saves and checks dismissed version in localStorage", () => {
      expect(isUpdateDismissed("v0.1.1")).toBe(false);
      dismissUpdate("v0.1.1");
      expect(isUpdateDismissed("v0.1.1")).toBe(true);
      expect(isUpdateDismissed("v0.1.2")).toBe(false);
    });
  });

  describe("CURRENT_APP_VERSION", () => {
    it("is defined as a semver string", () => {
      expect(CURRENT_APP_VERSION).toBe("0.1.0");
    });
  });
});
