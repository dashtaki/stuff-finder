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
        <li>Storage: {info ? `${formatMb(info.usage)} of ${formatMb(info.quota)}` : "…"}</li>
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
