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
