"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  DATE_RANGE_PRESETS,
  formatRangeLabel,
  resolveDateRange,
  type DateRangeKey,
} from "@/lib/date-range";

interface DashboardStats {
  totalSales: number;
  orderCount: number;
  activeTables: number;
  totalTables: number;
  topItemName: string | null;
  topItemQty: number;
}

interface CategoryMixItem {
  category: string;
  amount: number;
  percentage: number;
}

interface DashboardClientProps {
  stats: DashboardStats;
  categoryMix: CategoryMixItem[];
  rangeKey: DateRangeKey;
  from?: string;
  to?: string;
}

const categoryColors = [
  "bg-primary",
  "bg-primary/70",
  "bg-tertiary",
  "bg-orange-400",
];

export function DashboardClient({
  stats,
  categoryMix,
  rangeKey,
  from,
  to,
}: DashboardClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const range = resolveDateRange(rangeKey, from, to);
  const rangeLabel = formatRangeLabel(range);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function selectPreset(key: DateRangeKey) {
    if (key === "custom") return;
    const params = new URLSearchParams();
    params.set("range", key);
    router.push(`/dashboard?${params.toString()}`);
    setOpen(false);
  }

  function applyCustomRange() {
    if (!customFrom || !customTo) return;
    const params = new URLSearchParams();
    params.set("range", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    router.push(`/dashboard?${params.toString()}`);
    setOpen(false);
  }

  function exportPdf() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-10 print:hidden">
        <div>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Analytics Hub
          </h2>
          <p className="text-secondary mt-1">
            Performance metrics for {rangeLabel.toLowerCase()}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2 shadow-sm hover:border-primary/40 transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-sm mr-2">
                calendar_today
              </span>
              <span className="text-sm font-semibold text-on-surface">
                {rangeLabel}
              </span>
              <span className="material-symbols-outlined text-secondary text-sm ml-2">
                {open ? "expand_less" : "expand_more"}
              </span>
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl z-30 p-2">
                {DATE_RANGE_PRESETS.filter((p) => p.key !== "custom").map(
                  (preset) => (
                    <button
                      key={preset.key}
                      onClick={() => selectPreset(preset.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        rangeKey === preset.key
                          ? "bg-primary/10 text-primary"
                          : "text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                )}
                <div className="border-t border-outline-variant/20 mt-2 pt-2">
                  <p className="px-3 text-[11px] font-bold text-secondary uppercase tracking-wider mb-2">
                    Custom range
                  </p>
                  <div className="px-3 space-y-2">
                    <label className="block text-[11px] font-semibold text-secondary">
                      From
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="mt-1 w-full px-2 py-1.5 bg-surface-container border border-outline-variant/30 rounded-lg text-sm font-medium text-on-surface focus:outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-secondary">
                      To
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="mt-1 w-full px-2 py-1.5 bg-surface-container border border-outline-variant/30 rounded-lg text-sm font-medium text-on-surface focus:outline-none focus:border-primary/50"
                      />
                    </label>
                    <button
                      onClick={applyCustomRange}
                      disabled={!customFrom || !customTo}
                      className="w-full mt-1 primary-gradient text-white text-sm font-bold py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Apply range
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={exportPdf}
            className="flex items-center gap-2 bg-surface-container-highest px-4 py-2 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-dim transition-all"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export PDF
          </button>
        </div>
      </div>

      {/* Key Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {/* Total Sales */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">
            Total Sales
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-headline">
              {formatCurrency(stats.totalSales)}
            </h3>
            <span className="text-xs font-bold text-tertiary flex items-center">
              <span className="material-symbols-outlined text-xs">trending_up</span> 0%
            </span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">vs. previous period</p>
        </div>

        {/* Orders */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/5 rounded-full group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">
            Orders
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-headline">{stats.orderCount}</h3>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">
            {stats.orderCount === 0 ? "No orders yet today" : `${stats.orderCount} order${stats.orderCount !== 1 ? "s" : ""} today`}
          </p>
        </div>

        {/* Active Tables */}
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/5 rounded-full group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">
            Active Tables
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-headline">
              {stats.activeTables} / {stats.totalTables}
            </h3>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">
            {stats.activeTables === 0
              ? "All tables available"
              : `${stats.totalTables - stats.activeTables} table${stats.totalTables - stats.activeTables !== 1 ? "s" : ""} available`}
          </p>
        </div>

        {/* Top Item */}
        <div className="primary-gradient text-on-primary p-6 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-2">
            Top Performer
          </p>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black font-headline leading-tight">
              {stats.topItemName ?? "No data yet"}
            </h3>
            <span className="material-symbols-outlined text-white/50">star</span>
          </div>
          <p className="text-[10px] text-white/80 mt-1">
            {stats.topItemName
              ? `${stats.topItemQty} unit${stats.topItemQty !== 1 ? "s" : ""} sold today`
              : "Start taking orders to see your top seller"}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Getting Started - only show when no orders */}
        {stats.orderCount === 0 && (
          <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm">
            <h3 className="font-headline font-extrabold text-xl text-on-surface mb-6">
              Getting Started
            </h3>
            <div className="space-y-4">
              <Link
                href="/menu"
                className="flex items-center gap-4 p-4 hover:bg-surface-container-low rounded-xl transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-sm">restaurant_menu</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">Set up your menu</p>
                  <p className="text-xs text-secondary">Add categories, items, variants, and pricing</p>
                </div>
                <span className="material-symbols-outlined text-stone-300">arrow_forward</span>
              </Link>
              <Link
                href="/settings/tables"
                className="flex items-center gap-4 p-4 hover:bg-surface-container-low rounded-xl transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-sm">table_restaurant</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">Configure tables</p>
                  <p className="text-xs text-secondary">Set up your floor plan with table layout</p>
                </div>
                <span className="material-symbols-outlined text-stone-300">arrow_forward</span>
              </Link>
              <Link
                href="/settings/taxes"
                className="flex items-center gap-4 p-4 hover:bg-surface-container-low rounded-xl transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-600 text-sm">receipt</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">Configure taxes</p>
                  <p className="text-xs text-secondary">Set up GST rates for your items</p>
                </div>
                <span className="material-symbols-outlined text-stone-300">arrow_forward</span>
              </Link>
            </div>
          </div>
        )}

        {/* Category Mix */}
        <div className={`bg-surface-container-lowest p-8 rounded-xl shadow-sm flex flex-col ${stats.orderCount === 0 ? "" : "lg:col-span-3"}`}>
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-6">
            Category Mix
          </h3>
          <div className="flex-grow flex flex-col gap-6">
            {categoryMix.length > 0 ? (
              categoryMix.map((item, index) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-secondary">
                    <span>{item.category}</span>
                    <span>{item.percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full ${categoryColors[index % categoryColors.length]} rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-secondary">
                    <span>No categories</span>
                    <span>0%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-0" />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/20">
            <p className="text-xs font-medium text-secondary leading-relaxed">
              {categoryMix.length > 0
                ? `Showing ${categoryMix.length} categor${categoryMix.length !== 1 ? "ies" : "y"} by sales volume.`
                : "Start taking orders to see category performance data."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
