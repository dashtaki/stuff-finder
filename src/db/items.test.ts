import { afterEach, describe, expect, it, vi } from "vitest";
import { useNodeBlob } from "../test/nodeBlob";
import { db } from "./db";
import { addItem, getItem, listItems, removeItem, StorageError, updateItem } from "./items";

useNodeBlob();

afterEach(async () => {
  await db.items.clear();
  vi.restoreAllMocks();
});

describe("addItem", () => {
  it("stores trimmed values and timestamps", async () => {
    const id = await addItem({ name: "  Keys ", location: " Drawer " });
    const item = await getItem(id);
    expect(item).toMatchObject({ name: "Keys", location: "Drawer", note: "" });
    expect(item?.createdAt).toBeGreaterThan(0);
    expect(item?.updatedAt).toBe(item?.createdAt);
  });

  it("stores a photo blob", async () => {
    const photo = new Blob(["x"], { type: "image/jpeg" });
    const id = await addItem({ name: "Wallet", location: "Bag", photo });
    const item = await getItem(id);
    expect(item?.photo).toBeInstanceOf(Blob);
  });

  it("wraps storage failures in StorageError", async () => {
    vi.spyOn(db.items, "add").mockRejectedValue(new Error("QuotaExceededError"));
    await expect(addItem({ name: "A", location: "B" })).rejects.toBeInstanceOf(StorageError);
  });
});

describe("updateItem", () => {
  it("changes fields and bumps updatedAt", async () => {
    const id = await addItem({ name: "Keys", location: "Drawer" });
    const before = await getItem(id);
    await new Promise((r) => setTimeout(r, 5));
    await updateItem(id, { location: "Hook" });
    const after = await getItem(id);
    expect(after?.location).toBe("Hook");
    expect(after?.updatedAt).toBeGreaterThan(before?.updatedAt ?? 0);
  });

  it("removes the photo when patch.photo is null", async () => {
    const photo = new Blob(["x"], { type: "image/jpeg" });
    const id = await addItem({ name: "Wallet", location: "Bag", photo });
    await updateItem(id, { photo: null });
    const item = await getItem(id);
    expect(item?.photo).toBeUndefined();
  });
});

describe("removeItem", () => {
  it("deletes the row", async () => {
    const id = await addItem({ name: "Keys", location: "Drawer" });
    await removeItem(id);
    expect(await getItem(id)).toBeUndefined();
  });
});

describe("listItems", () => {
  it("returns newest updated first", async () => {
    const first = await addItem({ name: "First", location: "A" });
    await new Promise((r) => setTimeout(r, 5));
    const second = await addItem({ name: "Second", location: "B" });
    await new Promise((r) => setTimeout(r, 5));
    await updateItem(first, { note: "touched" });
    const ids = (await listItems()).map((i) => i.id);
    expect(ids).toEqual([first, second]);
  });
});
