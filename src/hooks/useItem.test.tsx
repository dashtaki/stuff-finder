import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { addItem } from "../db/items";
import { useItem } from "./useItem";

describe("useItem", () => {
  afterEach(() => db.items.clear());

  it("starts in loading state", () => {
    const { result } = renderHook(() => useItem(1));
    expect(result.current.status).toBe("loading");
  });

  it("returns ready with the item", async () => {
    const id = await addItem({ name: "Keys", location: "Hook" });
    const { result } = renderHook(() => useItem(id));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const state = result.current;
    if (state.status === "ready") expect(state.item.name).toBe("Keys");
  });

  it("returns missing for an unknown id", async () => {
    const { result } = renderHook(() => useItem(9999));
    await waitFor(() => expect(result.current.status).toBe("missing"));
  });

  it("returns missing for a non-integer id", async () => {
    const { result } = renderHook(() => useItem(Number.NaN));
    await waitFor(() => expect(result.current.status).toBe("missing"));
  });
});
