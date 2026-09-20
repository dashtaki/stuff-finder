const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function plural(count: number, unit: string): string {
  const suffix = count === 1 ? "" : "s";
  return `${count} ${unit}${suffix} ago`;
}

export function formatRelative(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return plural(Math.floor(diff / HOUR), "hour");
  const days = Math.floor(diff / DAY);
  if (days === 1) return "yesterday";
  if (days <= 30) return plural(days, "day");
  return new Date(timestamp).toLocaleDateString();
}
