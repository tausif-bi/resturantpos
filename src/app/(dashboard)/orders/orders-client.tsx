"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type OrdersListSort,
  type OrdersListTab,
  type OrdersListType,
  listOrdersForOrdersPage,
} from "@/lib/actions/order-actions";
import { formatCurrency } from "@/lib/utils";
import {
  ORDER_TINT_STYLES,
  getOrderRowTint,
  type OrderRowTint,
} from "@/lib/order-status-styles";
import { cn } from "@/lib/utils";

type OrdersListResult = Awaited<ReturnType<typeof listOrdersForOrdersPage>>;
type OrderRow = OrdersListResult["orders"][number];

interface Filters {
  tab: OrdersListTab;
  type: OrdersListType;
  sort: OrdersListSort;
  search: string;
  dateFrom: string;
  dateTo: string;
}

const TABS: { value: OrdersListTab; label: string }[] = [
  { value: "current", label: "Current Order" },
  { value: "online", label: "Online Order" },
  { value: "advance", label: "Advance Order" },
];

const TYPE_PILLS: { value: OrdersListType; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "apps" },
  { value: "DINE_IN", label: "Dine In", icon: "restaurant" },
  { value: "DELIVERY", label: "Delivery", icon: "delivery_dining" },
  { value: "TAKEAWAY", label: "Pick Up", icon: "shopping_bag" },
];

const SORT_OPTIONS: { value: OrdersListSort; label: string }[] = [
  { value: "latest", label: "Latest Date" },
  { value: "oldest", label: "Oldest Date" },
  { value: "amount_desc", label: "Amount ↓" },
  { value: "amount_asc", label: "Amount ↑" },
];

const TINTS: OrderRowTint[] = ["saved", "printed", "cancelled", "paid"];

function dominantPaymentMode(payments: OrderRow["payments"]): string {
  if (payments.length === 0) return "—";
  const completed = payments.find((p) => p.status === "COMPLETED");
  return formatPaymentMode((completed ?? payments[0]).mode);
}

function formatPaymentMode(mode: string): string {
  switch (mode) {
    case "CASH":
      return "Cash";
    case "CARD":
      return "Card";
    case "UPI":
      return "UPI";
    case "WALLET":
      return "Wallet";
    case "SPLIT":
      return "Split";
    default:
      return mode;
  }
}

function orderTypeLabel(type: string): string {
  switch (type) {
    case "DINE_IN":
      return "Dine In";
    case "DELIVERY":
      return "Delivery";
    case "TAKEAWAY":
      return "Pick Up";
    case "ONLINE":
      return "Online";
    default:
      return type;
  }
}

function formatCreated(d: string | Date): string {
  const date = new Date(d);
  return `${date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })} ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })}`;
}

export function OrdersClient({
  initialOrders,
  filters,
}: {
  initialOrders: OrderRow[];
  filters: Filters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(filters.search);

  const orders = initialOrders;

  function pushParams(next: Partial<Filters>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged: Filters = { ...filters, ...next };
    if (merged.tab !== "current") params.set("tab", merged.tab);
    else params.delete("tab");
    if (merged.type !== "all") params.set("type", merged.type);
    else params.delete("type");
    if (merged.sort !== "latest") params.set("sort", merged.sort);
    else params.delete("sort");
    if (merged.search) params.set("q", merged.search);
    else params.delete("q");
    if (merged.dateFrom) params.set("dateFrom", merged.dateFrom);
    else params.delete("dateFrom");
    if (merged.dateTo) params.set("dateTo", merged.dateTo);
    else params.delete("dateTo");
    startTransition(() => {
      router.push(`/orders${params.size ? `?${params}` : ""}`);
    });
  }

  function submitSearch() {
    pushParams({ search: searchInput.trim() });
  }

  function clearDateRange() {
    pushParams({ dateFrom: "", dateTo: "" });
  }

  const totalAmount = useMemo(
    () =>
      orders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0),
    [orders],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Orders
          </h2>
          <p className="text-secondary mt-1">
            {orders.length} order{orders.length === 1 ? "" : "s"}
            {totalAmount > 0 ? ` · ${formatCurrency(totalAmount)} total` : ""}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-outline-variant/40">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => pushParams({ tab: tab.value })}
            className={cn(
              "px-5 py-3 text-sm font-bold border-b-2 -mb-px transition-colors",
              filters.tab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:text-on-surface",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {TYPE_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => pushParams({ type: pill.value })}
              disabled={filters.tab === "online"}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                filters.type === pill.value && filters.tab !== "online"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container-low text-on-surface hover:bg-surface-container-high",
              )}
            >
              <span className="material-symbols-outlined text-[18px]">
                {pill.icon}
              </span>
              {pill.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(filters.dateFrom || filters.dateTo) && (
            <button
              onClick={clearDateRange}
              className="text-xs font-bold text-primary px-3 py-2 hover:underline"
            >
              Clear date filter
            </button>
          )}
          <DateRangePicker
            from={filters.dateFrom}
            to={filters.dateTo}
            onApply={(from, to) => pushParams({ dateFrom: from, dateTo: to })}
          />
        </div>
      </div>

      {/* Search + Sort + Legend */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
            className="relative"
          >
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-secondary pointer-events-none">
              search
            </span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onBlur={submitSearch}
              placeholder="Search order #, phone, name, table…"
              className="pl-10 pr-3 py-2.5 w-72 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </form>

          <label className="flex items-center gap-2 text-sm text-secondary">
            Sort By
            <select
              value={filters.sort}
              onChange={(e) =>
                pushParams({ sort: e.target.value as OrdersListSort })
              }
              className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {TINTS.map((tint) => (
            <span
              key={tint}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold",
                ORDER_TINT_STYLES[tint].chip,
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {ORDER_TINT_STYLES[tint].label}
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-secondary">
              <tr className="text-left">
                <Th>Order No.</Th>
                <Th>Order Type</Th>
                <Th>Customer Phone</Th>
                <Th>Customer Name</Th>
                <Th>Payment</Th>
                <Th className="text-right">My Amount</Th>
                <Th className="text-right">Tax</Th>
                <Th className="text-right">Discount</Th>
                <Th className="text-right">Grand Total</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center p-10">
                    <span className="material-symbols-outlined text-4xl text-stone-300 mb-2 block">
                      receipt_long
                    </span>
                    <p className="font-bold text-on-surface">No orders found</p>
                    <p className="text-xs text-secondary mt-1">
                      {filters.tab === "advance"
                        ? "Advance orders will appear here once reservations are integrated."
                        : "Try a different filter or take an order from the POS."}
                    </p>
                  </td>
                </tr>
              )}
              {orders.map((order) => {
                const tint = getOrderRowTint(order);
                const tintStyles = ORDER_TINT_STYLES[tint];
                const tableLabel = order.table?.name ?? null;
                return (
                  <tr
                    key={order.id}
                    className={cn(
                      "border-t border-outline-variant/20 transition-colors",
                      tintStyles.row,
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-bold font-mono text-on-surface bg-white/60 px-2 py-0.5 rounded-md">
                        {order.orderNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      <div className="font-semibold">
                        {orderTypeLabel(order.type)}
                        {tableLabel && (
                          <span className="text-secondary"> ({tableLabel})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-secondary">
                        {tintStyles.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      {order.customer?.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      {order.customer?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      {dominantPaymentMode(order.payments)}
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface">
                      {formatCurrency(Number(order.subtotal))}
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface">
                      {formatCurrency(Number(order.taxAmount))}
                    </td>
                    <td className="px-4 py-3 text-right text-secondary">
                      ({formatCurrency(Number(order.discountAmount))})
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold font-mono text-on-surface bg-white/60 px-2 py-0.5 rounded-md">
                        {formatCurrency(Number(order.totalAmount))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary text-xs whitespace-nowrap">
                      {formatCreated(order.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isPending && (
        <p className="text-xs text-secondary text-center">Updating…</p>
      )}
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[11px] font-bold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </th>
  );
}

function DateRangePicker({
  from,
  to,
  onApply,
}: {
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  return (
    <div className="relative">
      <button
        onClick={() => {
          setDraftFrom(from);
          setDraftTo(to);
          setOpen((o) => !o);
        }}
        className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-[18px]">history</span>
        Get Past Orders
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xl p-4 z-30 space-y-3"
          onMouseLeave={() => setOpen(false)}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-secondary">
            Date range
          </p>
          <label className="block text-xs text-secondary">
            From
            <input
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm"
            />
          </label>
          <label className="block text-xs text-secondary">
            To
            <input
              type="date"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-2 text-xs font-bold text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApply(draftFrom, draftTo);
                setOpen(false);
              }}
              className="primary-gradient text-on-primary px-3 py-2 rounded-lg text-xs font-bold"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
