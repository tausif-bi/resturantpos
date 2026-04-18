import { getDashboardStats, getCategoryMix } from "@/lib/actions/dashboard-actions";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const [stats, categoryMix] = await Promise.all([
    getDashboardStats(),
    getCategoryMix(),
  ]);
  return <DashboardClient stats={stats} categoryMix={categoryMix} />;
}
