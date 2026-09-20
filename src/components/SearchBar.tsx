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
