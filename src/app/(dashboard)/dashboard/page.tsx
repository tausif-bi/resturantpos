import { getDashboardStats, getCategoryMix } from "@/lib/actions/dashboard-actions";
import { resolveDateRange, type DateRangeKey } from "@/lib/date-range";
import { DashboardClient } from "./dashboard-client";

type SearchParams = Promise<{
  range?: string;
  from?: string;
  to?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const rangeKey = (sp.range ?? "today") as DateRangeKey;
  const range = resolveDateRange(rangeKey, sp.from, sp.to);
  const [stats, categoryMix] = await Promise.all([
    getDashboardStats(range),
    getCategoryMix(range),
  ]);
  return (
    <DashboardClient
      stats={stats}
      categoryMix={categoryMix}
      rangeKey={range.key}
      from={sp.from}
      to={sp.to}
    />
  );
}
