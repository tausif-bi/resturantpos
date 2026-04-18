"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

type SalesReport = {
  dailyData: { date: string; total: number; orderCount: number }[];
  summary: { totalSales: number; totalOrders: number; avgOrderValue: number };
};

type TopItem = {
  itemName: string;
  categoryName: string;
  quantity: number;
  revenue: number;
};

type StaffPerf = {
  staffName: string;
  role: string;
  orderCount: number;
  totalRevenue: number;
};

type CategoryBreak = {
  category: string;
  revenue: number;
  percentage: number;
};

type Props = {
  salesReport: SalesReport;
  topItems: TopItem[];
  staffPerf: StaffPerf[];
  categoryBreak: CategoryBreak[];
};

const BAR_COLORS = [
  "bg-primary",
  "bg-primary/70",
  "bg-tertiary",
  "bg-orange-400",
  "bg-secondary",
];

export function ReportsClient({ salesReport, topItems, staffPerf, categoryBreak }: Props) {
  const [chartMode, setChartMode] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const { summary, dailyData } = salesReport;
  const maxDailyTotal = dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.total)) : 1;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateRangeLabel = `${startOfMonth.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - ${now.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Analytics Hub
          </h2>
          <p className="text-secondary mt-1">
            Deep-dive into sales trends, staff output, and menu performance
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2 shadow-sm">
            <span className="material-symbols-outlined text-primary text-sm mr-2">
              calendar_today
            </span>
            <span className="text-sm font-semibold text-on-surface">
              {dateRangeLabel}
            </span>
          </div>
          <button className="flex items-center gap-2 bg-surface-container-highest px-4 py-2 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-dim transition-all">
            <span className="material-symbols-outlined text-sm">download</span>
            Export PDF
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {/* Total Sales */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">
            Total Sales
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-headline">
              {formatCurrency(summary.totalSales)}
            </h3>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">This period</p>
        </div>

        {/* Orders */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/5 rounded-full group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">
            Orders
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-headline">
              {summary.totalOrders.toLocaleString("en-IN")}
            </h3>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">This period</p>
        </div>

        {/* AOV */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/5 rounded-full group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">
            Avg. Order Value
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-headline">
              {formatCurrency(summary.avgOrderValue)}
            </h3>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">This period</p>
        </div>

        {/* Top Performer */}
        <div className="primary-gradient text-on-primary p-6 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2">
            Top Performer
          </p>
          {topItems.length > 0 ? (
            <>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black font-headline leading-tight">
                  {topItems[0].itemName}
                </h3>
                <span className="material-symbols-outlined text-white/50">star</span>
              </div>
              <p className="text-[10px] text-white/80 mt-1">
                {topItems[0].quantity} units sold this period
              </p>
            </>
          ) : (
            <h3 className="text-lg font-black font-headline leading-tight">No data</h3>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline font-extrabold text-xl text-on-surface">
              Sales Overview
            </h3>
            <div className="flex bg-surface-container rounded-lg p-1">
              {(["Daily", "Weekly", "Monthly"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    chartMode === mode
                      ? "bg-primary text-on-primary"
                      : "text-secondary hover:text-on-surface"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {dailyData.length > 0 ? (
            <>
              {/* Bar Chart */}
              <div className="flex items-end gap-2 h-48 mb-4">
                {dailyData.map((day) => {
                  const heightPct = maxDailyTotal > 0 ? (day.total / maxDailyTotal) * 100 : 0;
                  const dayLabel = new Date(day.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  });
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                      <div className="w-full h-full relative bg-surface-container rounded-t-md overflow-hidden">
                        <div
                          className="absolute bottom-0 left-0 w-full bg-primary rounded-t-md transition-all"
                          style={{ height: `${heightPct}%`, width: "60%", marginLeft: "20%" }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-secondary uppercase tracking-wider truncate w-full text-center">
                        {dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-xs font-semibold text-secondary">Daily Sales</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <span className="material-symbols-outlined text-4xl text-stone-300 mb-2">bar_chart</span>
              <p className="text-sm text-secondary">No data yet</p>
              <p className="text-xs text-stone-400 mt-1">Sales data will appear here once orders are completed</p>
            </div>
          )}
        </div>

        {/* Category Mix */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm flex flex-col">
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-6">
            Category Mix
          </h3>
          {categoryBreak.length > 0 ? (
            <div className="flex-grow flex flex-col gap-6">
              {categoryBreak.map((cat, i) => (
                <div key={cat.category} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-secondary">
                    <span>{cat.category}</span>
                    <span>{cat.percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-stone-300 mb-2">donut_small</span>
              <p className="text-sm text-secondary">No data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Lower Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
        {/* Staff Performance */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-6">
            Staff Performance
          </h3>
          {staffPerf.length > 0 ? (
            <div className="space-y-4">
              {staffPerf.map((staff) => (
                <div
                  key={staff.staffName}
                  className="flex items-center gap-4 p-4 hover:bg-surface-container-low rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-stone-400 text-sm">
                      person
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface">{staff.staffName}</p>
                    <p className="text-xs text-secondary capitalize">{staff.role.toLowerCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-on-surface">{staff.orderCount} orders</p>
                    <p className="text-xs text-secondary">{formatCurrency(staff.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-stone-300 mb-2">groups</span>
              <p className="text-sm text-secondary">No data yet</p>
              <p className="text-xs text-stone-400 mt-1">Staff performance will appear once orders are completed</p>
            </div>
          )}
        </div>

        {/* Top Selling Items */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-6">
            Top Selling Items
          </h3>
          {topItems.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="text-[10px] font-black uppercase tracking-widest text-secondary text-left pb-3">
                    Item
                  </th>
                  <th className="text-[10px] font-black uppercase tracking-widest text-secondary text-right pb-3">
                    Qty
                  </th>
                  <th className="text-[10px] font-black uppercase tracking-widest text-secondary text-right pb-3">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((item) => (
                  <tr
                    key={item.itemName}
                    className="border-b border-outline-variant/10 last:border-0"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-sm">
                            restaurant
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-bold text-on-surface block">{item.itemName}</span>
                          <span className="text-[10px] text-secondary">{item.categoryName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm font-semibold text-on-surface text-right">
                      {item.quantity}
                    </td>
                    <td className="text-sm font-semibold text-on-surface text-right">
                      {formatCurrency(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-stone-300 mb-2">restaurant_menu</span>
              <p className="text-sm text-secondary">No data yet</p>
              <p className="text-xs text-stone-400 mt-1">Top items will appear once orders are completed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
