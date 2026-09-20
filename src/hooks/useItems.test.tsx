import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { addItem } from "../db/items";
import { useItems } from "./useItems";

describe("useItems", () => {
  beforeEach(async () => {
    await addItem({ name: "Car keys", location: "Kitchen drawer" });
    await addItem({ name: "Passport", location: "Safe" });
  });
  afterEach(() => db.items.clear());

  it("returns all items for an empty query", async () => {
    const { result } = renderHook(() => useItems(""));
    await waitFor(() => expect(result.current).toHaveLength(2));
  });

  it("matches name, case-insensitive", async () => {
    const { result } = renderHook(() => useItems("PASS"));
    await waitFor(() => expect(result.current?.map((i) => i.name)).toEqual(["Passport"]));
  });

  it("matches location", async () => {
    const { result } = renderHook(() => useItems("drawer"));
    await waitFor(() => expect(result.current?.map((i) => i.name)).toEqual(["Car keys"]));
  });

  it("returns an empty list when nothing matches", async () => {
    const { result } = renderHook(() => useItems("zzz"));
    await waitFor(() => expect(result.current).toEqual([]));
  });
});
