import { Dexie, type EntityTable } from "dexie";

export interface Item {
  id: number;
  name: string;
  location: string;
  note: string;
  photo?: Blob;
  createdAt: number;
  updatedAt: number;
}

export const db = new Dexie("stuff-finder") as Dexie & {
  items: EntityTable<Item, "id">;
};

db.version(1).stores({
  items: "++id, name, location, updatedAt",
});
