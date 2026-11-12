import type { IdeaStatus } from "@/db/schema";
import { statusInfo } from "@/lib/status";

export function StatusBadge({ status }: { status: IdeaStatus }) {
  const info = statusInfo(status);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: info.color, background: `color-mix(in srgb, ${info.color} 15%, transparent)` }}
    >
      {info.label}
    </span>
  );
}

export function CategoryChip({ name, color }: { name: string | null; color: string | null }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color ?? "#8b8b9a" }} />
      {name}
    </span>
  );
}

export function Avatar({ name, image, size = 24 }: { name: string | null; image: string | null; size?: number }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" width={size} height={size} className="shrink-0 rounded-full" style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 days ago", rendered on the server; the exact date shows on hover. */
export function TimeAgo({ date }: { date: Date }) {
  const seconds = (date.getTime() - Date.now()) / 1000;
  let text = "just now";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      text = rtf.format(Math.round(seconds / size), unit);
      break;
    }
  }
  return (
    <time dateTime={date.toISOString()} title={date.toUTCString()}>
      {text}
    </time>
  );
}
