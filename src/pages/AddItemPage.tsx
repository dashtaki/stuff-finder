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
      <ItemForm submitLabel="Save" onSubmit={handleSubmit} onCancel={() => navigate("/")} />
    </main>
  );
}
