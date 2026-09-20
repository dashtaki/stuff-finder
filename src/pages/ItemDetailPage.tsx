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
