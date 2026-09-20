import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import type { Item } from "../db/db";
import { listItems } from "../db/items";

function matches(item: Item, needle: string): boolean {
  const inName = item.name.toLowerCase().includes(needle);
  const inLocation = item.location.toLowerCase().includes(needle);
  return inName || inLocation;
}

export function useItems(query: string): Item[] | undefined {
  const items = useLiveQuery(() => listItems(), []);
  const needle = query.trim().toLowerCase();

  return useMemo(() => {
    if (!items) return undefined;
    if (needle === "") return items;
    return items.filter((item) => matches(item, needle));
  }, [items, needle]);
}
