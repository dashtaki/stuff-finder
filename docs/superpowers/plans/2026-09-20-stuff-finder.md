# Stuff Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline, browser-only PWA where one person records where they put their things, with optional photos.

**Architecture:** Single React SPA. Dexie wraps IndexedDB in one `items` table; photos are stored as JPEG Blobs in the same row. Pages read data with `useLiveQuery` so the UI updates on every write. No backend, no auth, no external services.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Dexie 4 + dexie-react-hooks, vite-plugin-pwa, Vitest, React Testing Library, fake-indexeddb, Biome.

**Spec:** `docs/superpowers/specs/2026-09-20-stuff-finder-design.md`

## Global Constraints

- Project root: `~/mjd/stuff-finder`, a standalone clone of `github.com/dashtaki/stuff-finder`. The repo is empty at the start.
- Task 1 pushes the scaffold as the first `main` commit (the repo is empty). Everything else goes on branch `feat/mvp` and reaches `main` through the PR in Task 12.
- All commands below run from `~/mjd/stuff-finder` unless stated otherwise.
- `git add` paths in the tasks are relative to that root (for example `git add src/db`).
- Every component and hook takes props through a named `interface`. No inline prop types.
- Conditions with two or more parts go into a named `const` before the `if`.
- Code comments: max one short line, only for non-obvious traps.
- Run `npm run lint` (not `lint:fix`) before every commit. It must exit 0.
- Database name `stuff-finder`, version `1`, schema `items: "++id, name, location, updatedAt"`.
- Validation limits: name 1–80 chars, location 1–120 chars, note max 500 chars. All trimmed.
- Photo: one per item, JPEG, max 1200 px long edge, quality 0.8.
- No Sentry, no analytics, no network calls.
- Plain English in all UI text, commit messages, and comments.

## File structure

```
stuff-finder/
  index.html
  package.json
  vite.config.ts          Vite + React + Tailwind + PWA + Vitest config
  tsconfig.json
  biome.json
  public/icon.svg         source icon; PNGs generated from it
  src/
    main.tsx              mount app, ask for persistent storage
    App.tsx               RouterProvider
    routes.tsx            route table (shared with tests)
    index.css             Tailwind import
    vite-env.d.ts         Vite types + __APP_VERSION__
    test/setup.ts         fake-indexeddb + jest-dom
    db/db.ts              Dexie instance, Item type
    db/items.ts           addItem, updateItem, removeItem, getItem, listItems, StorageError
    lib/formatRelative.ts
    lib/shrinkImage.ts
    hooks/useObjectUrl.ts
    hooks/useItems.ts
    hooks/useItem.ts
    components/ErrorBoundary.tsx
    components/SearchBar.tsx
    components/EmptyState.tsx
    components/ItemCard.tsx
    components/PhotoInput.tsx
    components/ItemForm.tsx
    components/ConfirmDialog.tsx
    pages/DashboardPage.tsx
    pages/AddItemPage.tsx
    pages/ItemDetailPage.tsx
    pages/EditItemPage.tsx
    pages/DebugPage.tsx
```

Tests sit next to the file they test: `foo.ts` → `foo.test.ts`.

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test`, `npm run lint` scripts. Test setup that loads `fake-indexeddb/auto` and `@testing-library/jest-dom/vitest`.

- [ ] **Step 1: Start on main**

The repo is already cloned at `~/mjd/stuff-finder` and is empty. The scaffold commit becomes the first commit on `main` so that later PRs have a base. All other tasks go to `feat/mvp`.

```bash
cd ~/mjd/stuff-finder
git checkout -b main
```

- [ ] **Step 2: Scaffold with Vite**

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install dexie dexie-react-hooks react-router
npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb @biomejs/biome
```

Delete the files the template created that we do not use: `src/App.css`, `src/assets/react.svg`, `public/vite.svg`, `eslint.config.js`. Remove the `eslint*` and `@eslint/*` dev dependencies from `package.json` and run `npm install` again.

- [ ] **Step 3: Write `package.json` scripts**

Replace the `scripts` block:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "biome check .",
  "lint:fix": "biome check --write ."
}
```

Set `"version": "0.1.0"`.

- [ ] **Step 4: Write `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Stuff Finder",
        short_name: "Stuff",
        description: "Remember where you put your things",
        theme_color: "#0f172a",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

- [ ] **Step 5: Write `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;
```

- [ ] **Step 6: Write `src/test/setup.ts`**

```ts
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 7: Write `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["src/**", "*.ts", "*.json", "index.html"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "javascript": { "formatter": { "quoteStyle": "double", "semicolons": "always" } }
}
```

If `npx biome --version` prints a version other than 2.x, run `npx biome migrate --write` and keep the schema it produces.

- [ ] **Step 8: Write `src/index.css`, `src/App.tsx`, `src/main.tsx`**

`src/index.css`:

```css
@import "tailwindcss";
```

`src/App.tsx` (temporary, replaced in Task 5):

```tsx
export function App() {
  return <main className="p-4 text-lg">Stuff Finder</main>;
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Update `index.html`: set `<title>Stuff Finder</title>`, add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`, add `<meta name="theme-color" content="#0f172a" />`, remove the `vite.svg` icon link.

- [ ] **Step 9: Write a smoke test**

`src/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("has indexedDB from fake-indexeddb", () => {
    expect(globalThis.indexedDB).toBeDefined();
  });
});
```

- [ ] **Step 10: Run everything**

```bash
npm test
npm run lint
npm run build
```

Expected: 1 test passes, lint exits 0, build writes `dist/` with `sw.js` and `manifest.webmanifest`. Fix any lint complaints from the Vite template before moving on.

- [ ] **Step 11: Add `.gitignore` and commit**

`.gitignore`:

```
node_modules
dist
dev-dist
```

```bash
git add -A
git commit -m "feat: scaffold Vite + React + Tailwind + PWA project"
git push -u origin main
git checkout -b feat/mvp
```

This is the only direct push to `main`. Everything after this goes through the PR in Task 12.

---

### Task 2: Database schema and data layer

**Files:**
- Create: `src/db/db.ts`, `src/db/items.ts`, `src/db/items.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface Item { id: number; name: string; location: string; note: string; photo?: Blob; createdAt: number; updatedAt: number }
  interface NewItem { name: string; location: string; note?: string; photo?: Blob }
  interface ItemPatch { name?: string; location?: string; note?: string; photo?: Blob | null }  // null removes the photo
  class StorageError extends Error
  addItem(input: NewItem): Promise<number>
  updateItem(id: number, patch: ItemPatch): Promise<void>
  removeItem(id: number): Promise<void>
  getItem(id: number): Promise<Item | undefined>
  listItems(): Promise<Item[]>  // updatedAt desc
  db  // Dexie instance, for tests and useLiveQuery
  ```

- [ ] **Step 1: Write the failing tests**

`src/db/items.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { StorageError, addItem, getItem, listItems, removeItem, updateItem } from "./items";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/db/items.test.ts`
Expected: FAIL — cannot resolve `./db` and `./items`.

- [ ] **Step 3: Write `src/db/db.ts`**

```ts
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
```

- [ ] **Step 4: Write `src/db/items.ts`**

```ts
import { type Item, db } from "./db";

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
  constructor(cause: unknown) {
    super("Could not save. Your device may be out of storage.", { cause });
    this.name = "StorageError";
  }
}

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new StorageError(error);
  }
}

export function addItem(input: NewItem): Promise<number> {
  const now = Date.now();
  return guard(() =>
    db.items.add({
      name: input.name.trim(),
      location: input.location.trim(),
      note: (input.note ?? "").trim(),
      photo: input.photo,
      createdAt: now,
      updatedAt: now,
    }),
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
  });
}

export function removeItem(id: number): Promise<void> {
  return guard(() => db.items.delete(id));
}

export function getItem(id: number): Promise<Item | undefined> {
  return db.items.get(id);
}

export function listItems(): Promise<Item[]> {
  return db.items.orderBy("updatedAt").reverse().toArray();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/db/items.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add src/db
git commit -m "feat: add Dexie schema and items data layer"
```

---

### Task 3: Pure helpers — formatRelative and shrinkImage

**Files:**
- Create: `src/lib/formatRelative.ts`, `src/lib/formatRelative.test.ts`, `src/lib/shrinkImage.ts`, `src/lib/shrinkImage.test.ts`

**Interfaces:**
- Produces:
  ```ts
  formatRelative(timestamp: number, now?: number): string
  MAX_EDGE = 1200
  targetSize(width: number, height: number): { width: number; height: number }
  shrinkImage(file: Blob): Promise<Blob>   // JPEG
  ```

- [ ] **Step 1: Write failing tests for formatRelative**

`src/lib/formatRelative.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatRelative } from "./formatRelative";

const NOW = Date.UTC(2026, 8, 20, 12, 0, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelative", () => {
  it("says just now under a minute", () => {
    expect(formatRelative(NOW - 30_000, NOW)).toBe("just now");
  });
  it("counts minutes", () => {
    expect(formatRelative(NOW - 5 * MIN, NOW)).toBe("5 minutes ago");
    expect(formatRelative(NOW - 1 * MIN, NOW)).toBe("1 minute ago");
  });
  it("counts hours", () => {
    expect(formatRelative(NOW - 3 * HOUR, NOW)).toBe("3 hours ago");
  });
  it("says yesterday for one day", () => {
    expect(formatRelative(NOW - 1 * DAY, NOW)).toBe("yesterday");
  });
  it("counts days up to a month", () => {
    expect(formatRelative(NOW - 12 * DAY, NOW)).toBe("12 days ago");
  });
  it("falls back to a date after 30 days", () => {
    const result = formatRelative(NOW - 45 * DAY, NOW);
    expect(result).not.toMatch(/ago/);
    expect(result.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/formatRelative.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/formatRelative.ts`**

```ts
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function plural(count: number, unit: string): string {
  const suffix = count === 1 ? "" : "s";
  return `${count} ${unit}${suffix} ago`;
}

export function formatRelative(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return plural(Math.floor(diff / HOUR), "hour");
  const days = Math.floor(diff / DAY);
  if (days === 1) return "yesterday";
  if (days <= 30) return plural(days, "day");
  return new Date(timestamp).toLocaleDateString();
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/formatRelative.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write failing tests for shrinkImage**

`src/lib/shrinkImage.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_EDGE, shrinkImage, targetSize } from "./shrinkImage";

describe("targetSize", () => {
  it("keeps small images as they are", () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("caps the long edge for landscape", () => {
    expect(targetSize(4000, 3000)).toEqual({ width: MAX_EDGE, height: 900 });
  });
  it("caps the long edge for portrait", () => {
    expect(targetSize(3000, 4000)).toEqual({ width: 900, height: MAX_EDGE });
  });
});

describe("shrinkImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function stubCanvas(width: number, height: number) {
    const drawImage = vi.fn();
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width, height, close }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string,
    ) {
      callback(new Blob([`${this.width}x${this.height}`], { type }));
    });
    return { drawImage, close };
  }

  it("returns a JPEG blob drawn at the target size", async () => {
    const { drawImage, close } = stubCanvas(4000, 3000);
    const input = new Blob(["fake"], { type: "image/png" });
    const output = await shrinkImage(input);
    expect(output.type).toBe("image/jpeg");
    expect(await output.text()).toBe("1200x900");
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 900);
    expect(close).toHaveBeenCalled();
  });

  it("rejects when the canvas cannot encode", async () => {
    stubCanvas(100, 100);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
      callback(null),
    );
    await expect(shrinkImage(new Blob(["x"]))).rejects.toThrow("Could not process the photo");
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/lib/shrinkImage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Write `src/lib/shrinkImage.ts`**

```ts
export const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.8;

export function targetSize(width: number, height: number): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_EDGE) return { width, height };
  const scale = MAX_EDGE / longEdge;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function encodeJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not process the photo"));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export async function shrinkImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = targetSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not process the photo");
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return encodeJpeg(canvas);
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/lib/shrinkImage.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 9: Lint and commit**

```bash
npm run lint
git add src/lib
git commit -m "feat: add formatRelative and shrinkImage helpers"
```

---

### Task 4: Hooks — useObjectUrl, useItems, useItem

**Files:**
- Create: `src/hooks/useObjectUrl.ts`, `src/hooks/useObjectUrl.test.tsx`, `src/hooks/useItems.ts`, `src/hooks/useItems.test.tsx`, `src/hooks/useItem.ts`, `src/hooks/useItem.test.tsx`

**Interfaces:**
- Consumes: `db`, `Item`, `listItems`, `getItem` from Task 2.
- Produces:
  ```ts
  useObjectUrl(blob: Blob | null | undefined): string | undefined
  useItems(query: string): Item[] | undefined      // undefined while loading
  type ItemState = { status: "loading" } | { status: "missing" } | { status: "ready"; item: Item }
  useItem(id: number): ItemState
  ```

- [ ] **Step 1: Write failing test for useObjectUrl**

`src/hooks/useObjectUrl.test.tsx`:

```tsx
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useObjectUrl } from "./useObjectUrl";

describe("useObjectUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns undefined without a blob", () => {
    const { result } = renderHook(() => useObjectUrl(undefined));
    expect(result.current).toBeUndefined();
  });

  it("creates a url and revokes it on unmount", () => {
    const blob = new Blob(["x"]);
    const { result, unmount } = renderHook(() => useObjectUrl(blob));
    expect(result.current).toBe("blob:mock");
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/hooks/useObjectUrl.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/hooks/useObjectUrl.ts`**

```ts
import { useEffect, useState } from "react";

export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/hooks/useObjectUrl.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write failing test for useItems**

`src/hooks/useItems.test.tsx`:

```tsx
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
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/hooks/useItems.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7: Write `src/hooks/useItems.ts`**

```ts
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
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/hooks/useItems.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 9: Write failing test for useItem**

`src/hooks/useItem.test.tsx`:

```tsx
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
});
```

- [ ] **Step 10: Run to verify it fails**

Run: `npx vitest run src/hooks/useItem.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 11: Write `src/hooks/useItem.ts`**

```ts
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
  const result = useLiveQuery<Loaded, typeof LOADING>(
    async () => ({ loaded: true, item: await getItem(id) }),
    [id],
    LOADING,
  );

  if (!result.loaded) return { status: "loading" };
  if (!result.item) return { status: "missing" };
  return { status: "ready", item: result.item };
}
```

- [ ] **Step 12: Run to verify it passes**

Run: `npx vitest run src/hooks/useItem.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 13: Lint and commit**

```bash
npm run lint
git add src/hooks
git commit -m "feat: add useObjectUrl, useItems, useItem hooks"
```

---

### Task 5: Router, ErrorBoundary, app shell

**Files:**
- Create: `src/routes.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/ErrorBoundary.test.tsx`, `src/pages/DashboardPage.tsx` (placeholder), `src/pages/AddItemPage.tsx` (placeholder), `src/pages/ItemDetailPage.tsx` (placeholder), `src/pages/EditItemPage.tsx` (placeholder), `src/pages/DebugPage.tsx` (placeholder)
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Produces: `routes: RouteObject[]` exported from `src/routes.tsx` for `createMemoryRouter` in page tests. Route paths: `/`, `/new`, `/item/:id`, `/item/:id/edit`, `/debug`.

- [ ] **Step 1: Write failing test for ErrorBoundary**

`src/components/ErrorBoundary.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders children when nothing fails", () => {
    render(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("shows a fallback and logs when a child throws", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(log).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/ErrorBoundary.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/ErrorBoundary.tsx`**

```tsx
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled render error", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-slate-600">Reload the app to try again. Your items are safe.</p>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </main>
    );
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/ErrorBoundary.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write placeholder pages**

Each of the five page files gets a one-line placeholder so the router compiles. They are replaced in later tasks.

`src/pages/DashboardPage.tsx`:

```tsx
export function DashboardPage() {
  return <main className="p-4">Dashboard</main>;
}
```

Repeat for `AddItemPage`, `ItemDetailPage`, `EditItemPage`, `DebugPage` with the matching text ("Add item", "Item", "Edit item", "Debug").

- [ ] **Step 6: Write `src/routes.tsx`**

```tsx
import type { RouteObject } from "react-router";
import { AddItemPage } from "./pages/AddItemPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DebugPage } from "./pages/DebugPage";
import { EditItemPage } from "./pages/EditItemPage";
import { ItemDetailPage } from "./pages/ItemDetailPage";

export const routes: RouteObject[] = [
  { path: "/", element: <DashboardPage /> },
  { path: "/new", element: <AddItemPage /> },
  { path: "/item/:id", element: <ItemDetailPage /> },
  { path: "/item/:id/edit", element: <EditItemPage /> },
  { path: "/debug", element: <DebugPage /> },
];
```

- [ ] **Step 7: Rewrite `src/App.tsx`**

```tsx
import { RouterProvider, createBrowserRouter } from "react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { routes } from "./routes";

const router = createBrowserRouter(routes);

export function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
```

- [ ] **Step 8: Add the persist request to `src/main.tsx`**

Insert before `createRoot(...)`:

```ts
// Best effort: ask the browser not to evict our IndexedDB data.
void navigator.storage?.persist?.();
```

- [ ] **Step 9: Run all tests, lint, and dev server**

```bash
npm test
npm run lint
npm run dev
```

Open `http://localhost:5173/`, `/new`, `/item/1`, `/debug`. Each shows its placeholder text. Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add src
git commit -m "feat: add router, error boundary, and page placeholders"
```

---

### Task 6: Dashboard — SearchBar, EmptyState, ItemCard, DashboardPage

**Files:**
- Create: `src/components/SearchBar.tsx`, `src/components/EmptyState.tsx`, `src/components/ItemCard.tsx`, `src/components/ItemCard.test.tsx`, `src/pages/DashboardPage.test.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `useItems`, `useObjectUrl`, `formatRelative`, `Item`, `routes`.
- Produces:
  ```ts
  interface SearchBarProps { value: string; onChange(value: string): void }
  interface EmptyStateProps { title: string; actionLabel?: string; actionTo?: string }
  interface ItemCardProps { item: Item }
  ```

- [ ] **Step 1: Write failing test for ItemCard**

`src/components/ItemCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { Item } from "../db/db";
import { ItemCard } from "./ItemCard";

const item: Item = {
  id: 7,
  name: "Car keys",
  location: "Kitchen drawer",
  note: "",
  createdAt: Date.now() - 120_000,
  updatedAt: Date.now() - 120_000,
};

describe("ItemCard", () => {
  it("shows name, location, relative time, and links to detail", () => {
    render(
      <MemoryRouter>
        <ItemCard item={item} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Car keys")).toBeInTheDocument();
    expect(screen.getByText("Kitchen drawer")).toBeInTheDocument();
    expect(screen.getByText("2 minutes ago")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/item/7");
  });

  it("shows a placeholder when there is no photo", () => {
    render(
      <MemoryRouter>
        <ItemCard item={item} />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("No photo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/ItemCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/ItemCard.tsx`**

```tsx
import { Link } from "react-router";
import type { Item } from "../db/db";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { formatRelative } from "../lib/formatRelative";

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const photoUrl = useObjectUrl(item.photo);

  return (
    <Link
      to={`/item/${item.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50"
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <div
          aria-label="No photo"
          className="h-14 w-14 shrink-0 rounded-lg bg-slate-100"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="truncate text-sm text-slate-600">{item.location}</p>
        <p className="text-xs text-slate-400">{formatRelative(item.updatedAt)}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/ItemCard.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write `src/components/SearchBar.tsx` and `src/components/EmptyState.tsx`**

`src/components/SearchBar.tsx`:

```tsx
interface SearchBarProps {
  value: string;
  onChange(value: string): void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <input
      type="search"
      inputMode="search"
      placeholder="Search by name or place"
      aria-label="Search items"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
    />
  );
}
```

`src/components/EmptyState.tsx`:

```tsx
import { Link } from "react-router";

interface EmptyStateProps {
  title: string;
  actionLabel?: string;
  actionTo?: string;
}

export function EmptyState({ title, actionLabel, actionTo }: EmptyStateProps) {
  const hasAction = actionLabel !== undefined && actionTo !== undefined;
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center text-slate-600">
      <p>{title}</p>
      {hasAction && (
        <Link to={actionTo} className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write failing test for DashboardPage**

`src/pages/DashboardPage.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { addItem } from "../db/items";
import { routes } from "../routes";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe("DashboardPage", () => {
  afterEach(() => db.items.clear());

  it("shows the empty state with an add link when there are no items", async () => {
    renderAt("/");
    await waitFor(() =>
      expect(screen.getByText("Nothing saved yet. Add your first item.")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Add item" })).toHaveAttribute("href", "/new");
  });

  it("lists items and filters by search", async () => {
    await addItem({ name: "Car keys", location: "Drawer" });
    await addItem({ name: "Passport", location: "Safe" });
    renderAt("/");
    await waitFor(() => expect(screen.getByText("Passport")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Search items"), "car");
    await waitFor(() => expect(screen.queryByText("Passport")).not.toBeInTheDocument());
    expect(screen.getByText("Car keys")).toBeInTheDocument();
  });

  it("shows a no-match message", async () => {
    await addItem({ name: "Car keys", location: "Drawer" });
    renderAt("/");
    await waitFor(() => expect(screen.getByText("Car keys")).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText("Search items"), "zzz");
    await waitFor(() => expect(screen.getByText("No items match")).toBeInTheDocument());
  });

  it("has a link to add a new item", async () => {
    await addItem({ name: "Car keys", location: "Drawer" });
    renderAt("/");
    await waitFor(() => expect(screen.getByText("Car keys")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Add item" })).toHaveAttribute("href", "/new");
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npx vitest run src/pages/DashboardPage.test.tsx`
Expected: FAIL — placeholder text "Dashboard" rendered, expected text missing.

- [ ] **Step 8: Write `src/pages/DashboardPage.tsx`**

```tsx
import { useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "../components/EmptyState";
import { ItemCard } from "../components/ItemCard";
import { SearchBar } from "../components/SearchBar";
import { useItems } from "../hooks/useItems";

export function DashboardPage() {
  const [query, setQuery] = useState("");
  const items = useItems(query);

  const isLoading = items === undefined;
  const hasNoItemsAtAll = items !== undefined && items.length === 0 && query.trim() === "";
  const hasNoMatches = items !== undefined && items.length === 0 && query.trim() !== "";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 p-4 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stuff Finder</h1>
      </header>
      <SearchBar value={query} onChange={setQuery} />

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {hasNoItemsAtAll && (
        <EmptyState
          title="Nothing saved yet. Add your first item."
          actionLabel="Add item"
          actionTo="/new"
        />
      )}
      {hasNoMatches && <EmptyState title="No items match" />}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {!hasNoItemsAtAll && (
        <Link
          to="/new"
          aria-label="Add item"
          className="fixed right-5 bottom-6 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-3xl text-white shadow-lg"
        >
          +
        </Link>
      )}
    </main>
  );
}
```

- [ ] **Step 9: Run to verify it passes**

Run: `npx vitest run src/pages/DashboardPage.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 10: Lint and commit**

```bash
npm run lint
git add src
git commit -m "feat: add dashboard with search and item cards"
```

---

### Task 7: PhotoInput and ItemForm

**Files:**
- Create: `src/components/PhotoInput.tsx`, `src/components/PhotoInput.test.tsx`, `src/components/ItemForm.tsx`, `src/components/ItemForm.test.tsx`

**Interfaces:**
- Consumes: `shrinkImage`, `useObjectUrl`, `Item`, `StorageError`.
- Produces:
  ```ts
  interface PhotoInputProps { value: Blob | null; onChange(value: Blob | null): void }
  interface ItemFormValues { name: string; location: string; note: string; photo: Blob | null }
  interface ItemFormProps { initial?: Item; submitLabel: string; onSubmit(values: ItemFormValues): Promise<void>; onCancel(): void }
  ```
  `ItemForm` catches errors thrown by `onSubmit` and shows `error.message` next to the submit button.

- [ ] **Step 1: Write failing test for PhotoInput**

`src/components/PhotoInput.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotoInput } from "./PhotoInput";

vi.mock("../lib/shrinkImage", () => ({
  shrinkImage: vi.fn(),
}));

import { shrinkImage } from "../lib/shrinkImage";

describe("PhotoInput", () => {
  afterEach(() => vi.clearAllMocks());

  it("shrinks the chosen file and reports it", async () => {
    const small = new Blob(["small"], { type: "image/jpeg" });
    vi.mocked(shrinkImage).mockResolvedValue(small);
    const onChange = vi.fn();
    render(<PhotoInput value={null} onChange={onChange} />);

    const file = new File(["big"], "photo.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Take photo"), file);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(small));
  });

  it("shows an error when shrinking fails", async () => {
    vi.mocked(shrinkImage).mockRejectedValue(new Error("Could not process the photo"));
    render(<PhotoInput value={null} onChange={vi.fn()} />);
    await userEvent.upload(
      screen.getByLabelText("Take photo"),
      new File(["x"], "p.png", { type: "image/png" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Could not process the photo")).toBeInTheDocument(),
    );
  });

  it("offers remove when a photo is set", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:x", revokeObjectURL: () => {} });
    const onChange = vi.fn();
    render(<PhotoInput value={new Blob(["x"])} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(onChange).toHaveBeenCalledWith(null);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/PhotoInput.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/PhotoInput.tsx`**

```tsx
import { type ChangeEvent, useState } from "react";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { shrinkImage } from "../lib/shrinkImage";

interface PhotoInputProps {
  value: Blob | null;
  onChange(value: Blob | null): void;
}

export function PhotoInput({ value, onChange }: PhotoInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewUrl = useObjectUrl(value);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await shrinkImage(file));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not process the photo";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {previewUrl && (
        <img src={previewUrl} alt="Item photo" className="max-h-64 w-full rounded-xl object-cover" />
      )}
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-4 py-3 text-center">
          {busy ? "Processing…" : value ? "Replace photo" : "Take photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Take photo"
            disabled={busy}
            onChange={handleFile}
          />
        </label>
        {value && (
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-3"
            onClick={() => onChange(null)}
          >
            Remove photo
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/PhotoInput.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write failing test for ItemForm**

`src/components/ItemForm.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Item } from "../db/db";
import { StorageError } from "../db/items";
import { ItemForm } from "./ItemForm";

describe("ItemForm", () => {
  it("blocks submit when name or location is empty", async () => {
    const onSubmit = vi.fn();
    render(<ItemForm submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Location is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ItemForm submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "  Keys ");
    await userEvent.type(screen.getByLabelText("Location"), " Hook ");
    await userEvent.type(screen.getByLabelText("Note"), " spare ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Keys",
        location: "Hook",
        note: "spare",
        photo: null,
      }),
    );
  });

  it("prefills from initial", () => {
    const initial: Item = {
      id: 1,
      name: "Passport",
      location: "Safe",
      note: "top shelf",
      createdAt: 1,
      updatedAt: 1,
    };
    render(<ItemForm initial={initial} submitLabel="Save" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Passport");
    expect(screen.getByLabelText("Location")).toHaveValue("Safe");
    expect(screen.getByLabelText("Note")).toHaveValue("top shelf");
  });

  it("shows the error message when onSubmit throws", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new StorageError(new Error("quota")));
    render(<ItemForm submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "Keys");
    await userEvent.type(screen.getByLabelText("Location"), "Hook");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(
        screen.getByText("Could not save. Your device may be out of storage."),
      ).toBeInTheDocument(),
    );
  });

  it("calls onCancel", async () => {
    const onCancel = vi.fn();
    render(<ItemForm submitLabel="Save" onSubmit={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/components/ItemForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7: Write `src/components/ItemForm.tsx`**

```tsx
import { type FormEvent, useState } from "react";
import type { Item } from "../db/db";
import { PhotoInput } from "./PhotoInput";

export interface ItemFormValues {
  name: string;
  location: string;
  note: string;
  photo: Blob | null;
}

interface ItemFormProps {
  initial?: Item;
  submitLabel: string;
  onSubmit(values: ItemFormValues): Promise<void>;
  onCancel(): void;
}

interface FieldErrors {
  name?: string;
  location?: string;
  note?: string;
}

const NAME_MAX = 80;
const LOCATION_MAX = 120;
const NOTE_MAX = 500;

function validate(values: ItemFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name === "") errors.name = "Name is required";
  else if (values.name.length > NAME_MAX) errors.name = `Name must be ${NAME_MAX} characters or less`;
  if (values.location === "") errors.location = "Location is required";
  else if (values.location.length > LOCATION_MAX)
    errors.location = `Location must be ${LOCATION_MAX} characters or less`;
  if (values.note.length > NOTE_MAX) errors.note = `Note must be ${NOTE_MAX} characters or less`;
  return errors;
}

export function ItemForm({ initial, submitLabel, onSubmit, onCancel }: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [photo, setPhoto] = useState<Blob | null>(initial?.photo ?? null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const values: ItemFormValues = {
      name: name.trim(),
      location: location.trim(),
      note: note.trim(),
      photo,
    };
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not save";
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          className="rounded-lg border border-slate-300 px-3 py-3 text-base"
          autoComplete="off"
        />
        {errors.name && <span className="text-sm text-red-600">{errors.name}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Location</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={LOCATION_MAX}
          placeholder="e.g. kitchen drawer, left side"
          className="rounded-lg border border-slate-300 px-3 py-3 text-base"
          autoComplete="off"
        />
        {errors.location && <span className="text-sm text-red-600">{errors.location}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Note</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={NOTE_MAX}
          rows={3}
          className="rounded-lg border border-slate-300 px-3 py-3 text-base"
        />
        {errors.note && <span className="text-sm text-red-600">{errors.note}</span>}
      </label>

      <PhotoInput value={photo} onChange={setPhoto} />

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/components/ItemForm.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 9: Lint and commit**

```bash
npm run lint
git add src/components
git commit -m "feat: add PhotoInput and ItemForm"
```

---

### Task 8: AddItemPage

**Files:**
- Modify: `src/pages/AddItemPage.tsx`
- Create: `src/pages/AddItemPage.test.tsx`

**Interfaces:**
- Consumes: `ItemForm`, `ItemFormValues`, `addItem`, `routes`.

- [ ] **Step 1: Write failing test**

`src/pages/AddItemPage.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { listItems } from "../db/items";
import { routes } from "../routes";

describe("AddItemPage", () => {
  afterEach(() => db.items.clear());

  it("saves an item and goes back to the dashboard", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/new"] });
    render(<RouterProvider router={router} />);

    await userEvent.type(screen.getByLabelText("Name"), "Keys");
    await userEvent.type(screen.getByLabelText("Location"), "Hook");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    const items = await listItems();
    expect(items.map((i) => i.name)).toEqual(["Keys"]);
  });

  it("cancel goes back to the dashboard without saving", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/", "/new"], initialIndex: 1 });
    render(<RouterProvider router={router} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(await listItems()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/AddItemPage.test.tsx`
Expected: FAIL — no "Name" field on the placeholder page.

- [ ] **Step 3: Write `src/pages/AddItemPage.tsx`**

```tsx
import { useNavigate } from "react-router";
import { ItemForm, type ItemFormValues } from "../components/ItemForm";
import { addItem } from "../db/items";

export function AddItemPage() {
  const navigate = useNavigate();

  async function handleSubmit(values: ItemFormValues) {
    await addItem({
      name: values.name,
      location: values.location,
      note: values.note,
      photo: values.photo ?? undefined,
    });
    navigate("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Add item</h1>
      <ItemForm submitLabel="Save" onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
    </main>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/AddItemPage.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/pages
git commit -m "feat: add AddItemPage"
```

---

### Task 9: ConfirmDialog and ItemDetailPage

**Files:**
- Create: `src/components/ConfirmDialog.tsx`, `src/pages/ItemDetailPage.test.tsx`
- Modify: `src/pages/ItemDetailPage.tsx`

**Interfaces:**
- Consumes: `useItem`, `ItemState`, `useObjectUrl`, `formatRelative`, `removeItem`, `routes`.
- Produces:
  ```ts
  interface ConfirmDialogProps { open: boolean; title: string; message: string; confirmLabel: string; onConfirm(): void; onCancel(): void }
  ```

- [ ] **Step 1: Write failing test**

`src/pages/ItemDetailPage.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { addItem, getItem } from "../db/items";
import { routes } from "../routes";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe("ItemDetailPage", () => {
  afterEach(() => db.items.clear());

  it("shows the item and links to edit", async () => {
    const id = await addItem({ name: "Passport", location: "Safe", note: "top shelf" });
    renderAt(`/item/${id}`);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Passport" })).toBeInTheDocument());
    expect(screen.getByText("Safe")).toBeInTheDocument();
    expect(screen.getByText("top shelf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", `/item/${id}/edit`);
  });

  it("shows not found for an unknown id", async () => {
    renderAt("/item/9999");
    await waitFor(() => expect(screen.getByText("Item not found")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Back to all items" })).toHaveAttribute("href", "/");
  });

  it("cancel in the confirm dialog keeps the item", async () => {
    const id = await addItem({ name: "Keys", location: "Hook" });
    renderAt(`/item/${id}`);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Keys" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await getItem(id)).toBeDefined();
  });

  it("confirm deletes and goes to the dashboard", async () => {
    const id = await addItem({ name: "Keys", location: "Hook" });
    const router = renderAt(`/item/${id}`);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Keys" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete item" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(await getItem(id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/ItemDetailPage.test.tsx`
Expected: FAIL — placeholder page has no heading.

- [ ] **Step 3: Write `src/components/ConfirmDialog.tsx`**

```tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-2xl bg-white p-5"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-slate-600">{message}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-3"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/pages/ItemDetailPage.tsx`**

```tsx
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Item } from "../db/db";
import { removeItem } from "../db/items";
import { useItem } from "../hooks/useItem";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { formatRelative } from "../lib/formatRelative";

interface ItemDetailProps {
  item: Item;
}

function ItemDetail({ item }: ItemDetailProps) {
  const navigate = useNavigate();
  const photoUrl = useObjectUrl(item.photo);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    try {
      await removeItem(item.id);
      navigate("/");
    } catch (cause) {
      setConfirming(false);
      setError(cause instanceof Error ? cause.message : "Could not delete");
    }
  }

  return (
    <>
      {photoUrl && (
        <img src={photoUrl} alt={item.name} className="max-h-96 w-full rounded-xl object-cover" />
      )}
      <h1 className="text-2xl font-bold">{item.name}</h1>
      <p className="text-lg text-slate-700">{item.location}</p>
      {item.note !== "" && <p className="whitespace-pre-wrap text-slate-600">{item.note}</p>}
      <p className="text-sm text-slate-400">Updated {formatRelative(item.updatedAt)}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="mt-auto flex gap-2 pt-4">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex-1 rounded-lg border border-red-300 px-4 py-3 text-red-700"
        >
          Delete
        </button>
        <Link
          to={`/item/${item.id}/edit`}
          className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-center text-white"
        >
          Edit
        </Link>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete this item?"
        message="This cannot be undone."
        confirmLabel="Delete item"
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

export function ItemDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const state = useItem(id);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-3 p-4">
      <Link to="/" className="text-sm text-slate-500">
        ← All items
      </Link>
      {state.status === "loading" && <p className="text-slate-500">Loading…</p>}
      {state.status === "missing" && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p>Item not found</p>
          <Link to="/" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            Back to all items
          </Link>
        </div>
      )}
      {state.status === "ready" && <ItemDetail item={state.item} />}
    </main>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/pages/ItemDetailPage.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add src
git commit -m "feat: add item detail page with delete confirmation"
```

---

### Task 10: EditItemPage

**Files:**
- Modify: `src/pages/EditItemPage.tsx`
- Create: `src/pages/EditItemPage.test.tsx`

**Interfaces:**
- Consumes: `useItem`, `ItemForm`, `ItemFormValues`, `updateItem`, `routes`.

- [ ] **Step 1: Write failing test**

`src/pages/EditItemPage.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { addItem, getItem } from "../db/items";
import { routes } from "../routes";

describe("EditItemPage", () => {
  afterEach(() => db.items.clear());

  it("prefills, saves changes, and returns to the detail page", async () => {
    const id = await addItem({ name: "Keys", location: "Hook" });
    const router = createMemoryRouter(routes, { initialEntries: [`/item/${id}/edit`] });
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Keys"));
    await userEvent.clear(screen.getByLabelText("Location"));
    await userEvent.type(screen.getByLabelText("Location"), "Drawer");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/item/${id}`));
    expect((await getItem(id))?.location).toBe("Drawer");
  });

  it("removes the photo when the user removes it", async () => {
    const photo = new Blob(["x"], { type: "image/jpeg" });
    const id = await addItem({ name: "Wallet", location: "Bag", photo });
    const router = createMemoryRouter(routes, { initialEntries: [`/item/${id}/edit`] });
    render(<RouterProvider router={router} />);

    await userEvent.click(await screen.findByRole("button", { name: "Remove photo" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/item/${id}`));
    expect((await getItem(id))?.photo).toBeUndefined();
  });

  it("shows not found for an unknown id", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/item/9999/edit"] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(screen.getByText("Item not found")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/EditItemPage.test.tsx`
Expected: FAIL — placeholder page has no form.

- [ ] **Step 3: Write `src/pages/EditItemPage.tsx`**

```tsx
import { Link, useNavigate, useParams } from "react-router";
import { ItemForm, type ItemFormValues } from "../components/ItemForm";
import type { Item } from "../db/db";
import { updateItem } from "../db/items";
import { useItem } from "../hooks/useItem";

interface EditFormProps {
  item: Item;
}

function EditForm({ item }: EditFormProps) {
  const navigate = useNavigate();

  async function handleSubmit(values: ItemFormValues) {
    await updateItem(item.id, values);
    navigate(`/item/${item.id}`);
  }

  return (
    <ItemForm
      initial={item}
      submitLabel="Save"
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/item/${item.id}`)}
    />
  );
}

export function EditItemPage() {
  const params = useParams();
  const id = Number(params.id);
  const state = useItem(id);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Edit item</h1>
      {state.status === "loading" && <p className="text-slate-500">Loading…</p>}
      {state.status === "missing" && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p>Item not found</p>
          <Link to="/" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            Back to all items
          </Link>
        </div>
      )}
      {state.status === "ready" && <EditForm item={state.item} />}
    </main>
  );
}
```

The `updateItem(item.id, values)` call works because `ItemFormValues` has the same shape as `ItemPatch` with `photo: Blob | null` — `null` removes the photo.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/EditItemPage.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/pages
git commit -m "feat: add EditItemPage"
```

---

### Task 11: DebugPage

**Files:**
- Modify: `src/pages/DebugPage.tsx`
- Create: `src/pages/DebugPage.test.tsx`

**Interfaces:**
- Consumes: `db`, `routes`, `__APP_VERSION__`.

- [ ] **Step 1: Write failing test**

`src/pages/DebugPage.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/db";
import { addItem } from "../db/items";
import { routes } from "../routes";

describe("DebugPage", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 2_000_000, quota: 100_000_000 }),
        persisted: vi.fn().mockResolvedValue(true),
      },
    });
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    await db.items.clear();
  });

  it("shows count, storage, persistence, and version", async () => {
    await addItem({ name: "A", location: "B" });
    const router = createMemoryRouter(routes, { initialEntries: ["/debug"] });
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(screen.getByText("Items: 1")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Storage: 1.9 MB of 95.4 MB")).toBeInTheDocument());
    expect(screen.getByText("Persistent storage: yes")).toBeInTheDocument();
    expect(screen.getByText(/^Version: /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/DebugPage.test.tsx`
Expected: FAIL — placeholder text only.

- [ ] **Step 3: Write `src/pages/DebugPage.tsx`**

```tsx
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { db } from "../db/db";

interface StorageInfo {
  usage: number;
  quota: number;
  persisted: boolean;
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readStorageInfo(): Promise<StorageInfo> {
  const storage = navigator.storage;
  const estimate = storage?.estimate ? await storage.estimate() : {};
  const persisted = storage?.persisted ? await storage.persisted() : false;
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted };
}

export function DebugPage() {
  const count = useLiveQuery(() => db.items.count(), []);
  const [info, setInfo] = useState<StorageInfo | null>(null);

  useEffect(() => {
    void readStorageInfo().then(setInfo);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-3 p-4">
      <Link to="/" className="text-sm text-slate-500">
        ← All items
      </Link>
      <h1 className="text-2xl font-bold">Debug</h1>
      <ul className="flex flex-col gap-1 font-mono text-sm">
        <li>Items: {count ?? "…"}</li>
        <li>
          Storage: {info ? `${formatMb(info.usage)} of ${formatMb(info.quota)}` : "…"}
        </li>
        <li>Persistent storage: {info ? (info.persisted ? "yes" : "no") : "…"}</li>
        <li>Version: {__APP_VERSION__}</li>
      </ul>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 rounded-lg border border-slate-300 px-4 py-3"
      >
        Reload
      </button>
    </main>
  );
}
```

`__APP_VERSION__` comes from the top-level `define` in `vite.config.ts` (Task 1). Vitest shares that config, so it is defined in tests too.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/DebugPage.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/pages
git commit -m "feat: add debug page with storage info"
```

---

### Task 12: PWA icons, final checks, README

**Files:**
- Create: `public/icon.svg`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `README.md`

- [ ] **Step 1: Create the source icon**

`public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <circle cx="230" cy="230" r="120" fill="none" stroke="#ffffff" stroke-width="40"/>
  <line x1="318" y1="318" x2="420" y2="420" stroke="#ffffff" stroke-width="44" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Generate PNG icons**

```bash
npx --yes @vite-pwa/assets-generator --preset minimal-2023 public/icon.svg
```

Confirm `public/pwa-192x192.png` and `public/pwa-512x512.png` exist. Delete any extra generated files you do not reference (`apple-touch-icon-180x180.png` may stay; add it to `includeAssets` in `vite.config.ts` if kept, and add `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />` to `index.html`).

- [ ] **Step 3: Full test, lint, build**

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass (about 40), lint exits 0, `dist/manifest.webmanifest` lists the icons.

- [ ] **Step 4: Manual smoke test on a phone**

```bash
npm run preview -- --host
```

Open the printed LAN URL on your phone (same Wi-Fi). Check:

1. Dashboard shows the empty state.
2. Add an item with a camera photo. It appears on the dashboard with a thumbnail.
3. Tap it. Photo, name, location show. Edit the location. Detail page updates.
4. Search for part of the location. Only that item shows.
5. Delete → Cancel keeps it. Delete → Delete item removes it.
6. Turn on airplane mode, reload. App still opens and data is there.
7. Browser menu → "Add to Home Screen". Icon appears. Open from the icon: standalone, no browser bar.
8. Open `/debug`. Items count and storage numbers are shown.

Note: camera capture and "Add to Home Screen" need HTTPS on most phones. `vite preview --host` is plain HTTP. If the camera does not open, use `npx --yes local-ssl-proxy --source 4174 --target 4173` and open `https://<lan-ip>:4174`, accepting the self-signed certificate. Or install the `@vitejs/plugin-basic-ssl` dev dependency and add it to the plugins list for the check, then remove it.

- [ ] **Step 5: Write `README.md`**

```markdown
# Stuff Finder

Remember where you put your things. Offline web app, no account, data stays on your device.

## Run

npm install
npm run dev

## Test and lint

npm test
npm run lint

## Build

npm run build
npm run preview -- --host

## Notes

- Data lives in IndexedDB under the origin. Clearing site data deletes everything.
- `/debug` shows item count and storage usage. It is not linked from the UI.
- Spec and plan: docs/superpowers/specs and docs/superpowers/plans in this repo.
```

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add -A
git commit -m "feat: add PWA icons and README"
```

- [ ] **Step 7: Push and open the PR**

```bash
git push -u origin feat/mvp
gh pr create --base main --title "MVP: dashboard, add, edit, delete, photos" --body "$(cat <<'EOF'
## What

First version of Stuff Finder. Offline PWA, no login, data in IndexedDB.

- Dashboard with search
- Add, edit, delete items
- One photo per item, shrunk to 1200px JPEG
- Error boundary, persistent storage request, /debug page

## Test

npm test, npm run lint, npm run build all pass. Manual check on a phone: add with camera, edit, search, delete, offline reload, add to home screen.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr edit --add-assignee @me
```
---

## Self-review notes

- Spec §3 data model → Task 2. §4 data layer and StorageError → Task 2, surfaced in Task 7 (form) and Task 9 (delete). §5 screens → Tasks 6, 8, 9, 10, 11. §6 photos → Tasks 3 and 7. §7 error boundary, persist, debug → Tasks 5 and 11. §8 PWA → Tasks 1 and 12. §9 tests → every task. §10 out of scope → nothing added.
- Names used across tasks: `Item`, `NewItem`, `ItemPatch`, `StorageError`, `addItem`, `updateItem`, `removeItem`, `getItem`, `listItems`, `useItems`, `useItem`, `ItemState`, `useObjectUrl`, `shrinkImage`, `targetSize`, `MAX_EDGE`, `formatRelative`, `ItemFormValues`, `routes`. Each is defined before it is used.
- Commits go to branch `feat/mvp` in `~/mjd/stuff-finder`. Push and PR happen only in Task 12, Step 7.
