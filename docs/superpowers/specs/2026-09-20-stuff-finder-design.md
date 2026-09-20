# Stuff Finder — MVP design

Date: 2026-09-20
Status: draft, approved in chat

## Goal

A small app that helps one person remember where they put their things: keys, wallet, documents, chargers, anything. The user adds an item with a name, a location, an optional note, and an optional photo. Later they search for it and see where it is.

This is an MVP. No login, no sync, no backend. All data stays in the browser.

## Decisions made

| Question | Decision |
|---|---|
| Platform | Web app, mobile-first, installable PWA |
| Storage | Browser only, IndexedDB via Dexie |
| Location model | One free-text field per item |
| Repo location | Standalone repo `github.com/dashtaki/stuff-finder`, cloned at `~/mjd/stuff-finder`. Spec and plan live in this repo under `docs/superpowers/`. |
| Observability | No external service. Error boundary + debug screen. See section 7. |

## 1. Stack

- React 19, TypeScript, Vite
- Biome for lint and format
- Tailwind CSS
- React Router
- Dexie + `dexie-react-hooks` for IndexedDB
- `vite-plugin-pwa` for manifest and offline service worker
- Vitest, React Testing Library, `fake-indexeddb` for tests

## 2. Folder layout

```
stuff-finder/
  src/
    db/
      db.ts            Dexie instance and schema
      items.ts         addItem, updateItem, removeItem, listItems, getItem
    lib/
      shrinkImage.ts   resize a File to a small JPEG Blob
      formatRelative.ts "2 days ago"
    hooks/
      useItems.ts      live list, with search filter
      useItem.ts       live single item by id
      useObjectUrl.ts  create/revoke object URL for a Blob
    components/
      ItemCard.tsx
      ItemForm.tsx
      PhotoInput.tsx
      SearchBar.tsx
      EmptyState.tsx
      ConfirmDialog.tsx
      ErrorBoundary.tsx
    pages/
      DashboardPage.tsx
      AddItemPage.tsx
      ItemDetailPage.tsx
      EditItemPage.tsx
      DebugPage.tsx
    App.tsx
    main.tsx
  index.html
  vite.config.ts
  biome.json
  package.json
```

Every component and hook takes props through a named `interface`, never an inline type.

## 3. Data model

One Dexie table: `items`.

| field | type | notes |
|---|---|---|
| `id` | `number` | auto-increment primary key |
| `name` | `string` | required, trimmed, 1–80 chars |
| `location` | `string` | required, trimmed, 1–120 chars |
| `note` | `string` | optional, max 500 chars, stored as `""` when empty |
| `photo` | `Blob \| undefined` | JPEG, not indexed |
| `createdAt` | `number` | epoch ms |
| `updatedAt` | `number` | epoch ms |

Schema string: `items: "++id, name, location, updatedAt"`.

The Blob lives in the same row. Dexie stores non-indexed fields without problems.

Database name: `stuff-finder`. Version: `1`.

## 4. Data layer (`src/db/items.ts`)

Functions, all `async`:

- `addItem(input: NewItem): Promise<number>` — sets `createdAt` and `updatedAt` to now, returns new id.
- `updateItem(id: number, patch: ItemPatch): Promise<void>` — sets `updatedAt` to now.
- `removeItem(id: number): Promise<void>`
- `getItem(id: number): Promise<Item | undefined>`
- `listItems(): Promise<Item[]>` — sorted by `updatedAt` descending.

Search is done in memory in `useItems`: filter on `name` and `location`, case-insensitive, substring match. Fine for a few hundred items.

Every write is wrapped in `try/catch`. On failure the function throws a `StorageError` with a plain message. Pages catch it and show the message inline near the save button. Photos are never lost silently.

## 5. Screens

### Dashboard (`/`)

- Search bar at the top. Filters the list as the user types.
- List of `ItemCard`: thumbnail (or placeholder icon), name, location, "updated 2 days ago".
- Tap a card → detail page.
- Floating "+" button → add page.
- Empty state when there are no items: one sentence and a button to add the first item.
- Empty search result: "No items match".

### Add (`/new`)

`ItemForm` with name, location, note, photo. Name and location are required. Save → dashboard. Cancel → back.

### Detail (`/item/:id`)

Full-width photo (if any), name, location, note, updated time. Buttons: Edit, Delete. Delete opens `ConfirmDialog` once. Confirm → remove and go to dashboard. Unknown id → "Item not found" with a link home.

### Edit (`/item/:id/edit`)

Same `ItemForm`, prefilled. Save → detail page. Photo can be replaced or removed.

### Debug (`/debug`)

Not linked from the UI. Shows: item count, storage used and quota from `navigator.storage.estimate()`, whether storage is persisted, app version. Button: "Reload".

## 6. Photos

- `PhotoInput` renders `<input type="file" accept="image/*" capture="environment">`. Phones open the camera; desktops open a file picker.
- One photo per item.
- Before saving, `shrinkImage(file)` draws the image on a canvas at max 1200 px on the long side and exports JPEG at quality 0.8. Returns a `Blob`. If the image is already smaller, it still re-encodes to JPEG for consistency.
- Display with `useObjectUrl(blob)` which calls `URL.createObjectURL` and revokes it on unmount or blob change.

## 7. Error handling and observability

No external error tracking or analytics. Everything stays on the device.

- `ErrorBoundary` wraps the router. On a render crash it shows "Something went wrong" with a Reload button, and logs the error with `console.error`.
- Storage writes: see section 4. Failures show inline; nothing is swallowed.
- On first load, call `navigator.storage.persist()`. Result is stored nowhere; the debug page reads `navigator.storage.persisted()` live.
- Debug page (section 5) gives a quick view of storage health.

## 8. PWA

`vite-plugin-pwa` with `registerType: "autoUpdate"`. Manifest: name "Stuff Finder", standalone display, portrait, one icon set. Service worker caches the app shell so the app opens offline. No push, no background sync.

## 9. Testing

Vitest with `jsdom` and `fake-indexeddb/auto`.

- `db/items.test.ts` — add, get, list order, update changes `updatedAt`, remove.
- `lib/shrinkImage.test.ts` — output is a JPEG Blob and not larger than the limit. Canvas is mocked in jsdom.
- `hooks/useItems.test.tsx` — search filter matches name and location, case-insensitive.
- `components/ItemForm.test.tsx` — required fields block save; submit passes trimmed values.
- `pages/ItemDetailPage.test.tsx` — delete requires confirm; cancel keeps the item.

No end-to-end tests in the MVP.

## 10. Out of scope

Login, accounts, sync, cloud backup, multiple photos per item, tags, categories, a separate locations table, reminders, barcode scan, export/import, sharing, Sentry, analytics.

## 11. Known risks

- **Data loss on clearing site data.** Browser-only storage has no recovery. Export/import is the first follow-up feature.
- **Storage eviction.** `navigator.storage.persist()` asks the browser to keep data, but Safari may still evict after long inactivity. Same mitigation: export/import later.
- **Quota.** Photos are shrunk to keep rows small. A save that hits the quota fails with a visible message.
