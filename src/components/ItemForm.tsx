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
  else if (values.name.length > NAME_MAX)
    errors.name = `Name must be ${NAME_MAX} characters or less`;
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
