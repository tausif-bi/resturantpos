export type DateRangeKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "month"
  | "custom";

export type DateRange = { from: Date; to: Date; key: DateRangeKey };

export const DATE_RANGE_PRESETS: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom range" },
];

export function resolveDateRange(
  key: DateRangeKey | undefined,
  fromIso?: string,
  toIso?: string
): DateRange {
  const start = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const end = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  const now = new Date();
  switch (key) {
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { key: "yesterday", from: start(y), to: end(y) };
    }
    case "last7": {
      const f = new Date(now);
      f.setDate(f.getDate() - 6);
      return { key: "last7", from: start(f), to: end(now) };
    }
    case "last30": {
      const f = new Date(now);
      f.setDate(f.getDate() - 29);
      return { key: "last30", from: start(f), to: end(now) };
    }
    case "month": {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      return { key: "month", from: start(f), to: end(now) };
    }
    case "custom": {
      const f = fromIso ? new Date(fromIso) : now;
      const t = toIso ? new Date(toIso) : now;
      return { key: "custom", from: start(f), to: end(t) };
    }
    case "today":
    default:
      return { key: "today", from: start(now), to: end(now) };
  }
}

export function formatRangeLabel(range: DateRange): string {
  if (range.key !== "custom") {
    const preset = DATE_RANGE_PRESETS.find((p) => p.key === range.key);
    return preset?.label ?? "Today";
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}
