import { getSalesReport, getTopSellingItems, getStaffPerformance, getCategoryBreakdown } from "@/lib/actions/report-actions";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [salesReport, topItems, staffPerf, categoryBreak] = await Promise.all([
    getSalesReport(startOfMonth, now),
    getTopSellingItems(startOfMonth, now),
    getStaffPerformance(startOfMonth, now),
    getCategoryBreakdown(startOfMonth, now),
  ]);

  return <ReportsClient salesReport={salesReport} topItems={topItems} staffPerf={staffPerf} categoryBreak={categoryBreak} />;
}
