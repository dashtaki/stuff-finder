import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("has indexedDB from fake-indexeddb", () => {
    expect(globalThis.indexedDB).toBeDefined();
  });
});
