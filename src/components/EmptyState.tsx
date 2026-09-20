import { Link } from "react-router";

interface EmptyStateProps {
  title: string;
  actionLabel?: string;
  actionTo?: string;
}

export function EmptyState({ title, actionLabel, actionTo }: EmptyStateProps) {
  const hasAction = actionLabel !== undefined && actionTo !== undefined;
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center text-slate-600">
      <p>{title}</p>
      {hasAction && (
        <Link to={actionTo} className="rounded-lg bg-slate-900 px-4 py-2 text-white">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
