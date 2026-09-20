# Stuff Finder

Remember where you put your things. Offline web app, no account, data stays on your device.

## Run

```bash
npm install
npm run dev
```

If `npm install` fails on peer dependencies, run `npm install --legacy-peer-deps`.

## Test and lint

```bash
npm test
npm run lint
```

## Build

```bash
npm run build
npm run preview -- --host
```

## Notes

- Data lives in IndexedDB under the origin. Clearing site data deletes everything.
- `/debug` shows item count and storage usage. It is not linked from the UI.
- Spec and plan: `docs/superpowers/specs` and `docs/superpowers/plans` in this repo.

## Manual check (on a phone)

Run `npm run preview -- --host`. Open the printed LAN URL on your phone (same Wi-Fi). Check:

1. Dashboard shows the empty state.
2. Add an item with a camera photo. It appears on the dashboard with a thumbnail.
3. Tap it. Photo, name, location show. Edit the location. Detail page updates.
4. Search for part of the location. Only that item shows.
5. Delete, then Cancel keeps it. Delete, then "Delete item" removes it.
6. Turn on airplane mode, reload. App still opens and data is there.
7. Browser menu, then "Add to Home Screen". Icon appears. Open from the icon: standalone, no browser bar.
8. Open `/debug`. Items count and storage numbers are shown.

Note: camera capture and "Add to Home Screen" need HTTPS on most phones. `vite preview --host` is plain HTTP. If the camera does not open, run `npx --yes local-ssl-proxy --source 4174 --target 4173` and open `https://<lan-ip>:4174`. Accept the self-signed certificate. Or install the `@vitejs/plugin-basic-ssl` dev dependency, add it to the plugins list for the check, then remove it.
