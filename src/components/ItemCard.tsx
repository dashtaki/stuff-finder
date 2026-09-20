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
          aria-hidden="true"
          data-testid="no-photo"
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
