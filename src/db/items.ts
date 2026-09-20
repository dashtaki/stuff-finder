import { db, type Item } from "./db";

export interface NewItem {
  name: string;
  location: string;
  note?: string;
  photo?: Blob;
}

export interface ItemPatch {
  name?: string;
  location?: string;
  note?: string;
  photo?: Blob | null;
}

export class StorageError extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = "StorageError";
  }
}

const SAVE_FAILED = "Could not save. Your device may be out of storage.";
const DELETE_FAILED = "Could not delete this item.";

async function guard<T>(operation: () => Promise<T>, message: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new StorageError(message, error);
  }
}

export function addItem(input: NewItem): Promise<number> {
  const now = Date.now();
  return guard(
    () =>
      db.items.add({
        name: input.name.trim(),
        location: input.location.trim(),
        note: (input.note ?? "").trim(),
        photo: input.photo,
        createdAt: now,
        updatedAt: now,
      }),
    SAVE_FAILED,
  );
}

export function updateItem(id: number, patch: ItemPatch): Promise<void> {
  const changes: Partial<Item> = { updatedAt: Date.now() };
  if (patch.name !== undefined) changes.name = patch.name.trim();
  if (patch.location !== undefined) changes.location = patch.location.trim();
  if (patch.note !== undefined) changes.note = patch.note.trim();
  if (patch.photo !== undefined) changes.photo = patch.photo ?? undefined;
  return guard(async () => {
    await db.items.update(id, changes);
  }, SAVE_FAILED);
}

export function removeItem(id: number): Promise<void> {
  return guard(() => db.items.delete(id), DELETE_FAILED);
}

export function getItem(id: number): Promise<Item | undefined> {
  return db.items.get(id);
}

export function listItems(): Promise<Item[]> {
  return db.items.orderBy("updatedAt").reverse().toArray();
}
