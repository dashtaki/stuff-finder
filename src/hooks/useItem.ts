import { useLiveQuery } from "dexie-react-hooks";
import type { Item } from "../db/db";
import { getItem } from "../db/items";

export type ItemState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; item: Item };

interface Loaded {
  loaded: true;
  item: Item | undefined;
}

const LOADING = { loaded: false } as const;

export function useItem(id: number): ItemState {
  const isValidId = Number.isInteger(id);
  const result = useLiveQuery<Loaded, typeof LOADING>(
    async () => ({ loaded: true, item: isValidId ? await getItem(id) : undefined }),
    [id],
    LOADING,
  );

  if (!result.loaded) return { status: "loading" };
  if (!result.item) return { status: "missing" };
  return { status: "ready", item: result.item };
}
