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
  const hasItems = items !== undefined && items.length > 0;
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

      {hasItems && (
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
