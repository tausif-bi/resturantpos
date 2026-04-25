"use client";

import {
  useState,
  useEffect,
  useTransition,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  getActiveKOTs,
  updateKOTStatus,
  setOrderItemPrepared,
} from "@/lib/actions/kot-actions";

type KOTList = Awaited<ReturnType<typeof getActiveKOTs>>;
type KOT = KOTList[number];
type KOTItem = KOT["items"][number];

type OrderGroup = {
  orderId: string;
  orderNumber: string;
  order: KOT["order"];
  kots: KOT[];
  earliestCreatedAt: Date | string;
};

function formatElapsed(createdAt: Date | string): string {
  const diff = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  );
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function elapsedMinutes(createdAt: Date | string): number {
  return Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000 / 60
  );
}

function orderTypeMeta(
  type: KOT["order"]["type"],
  tableName?: string | null,
  customerName?: string | null
) {
  switch (type) {
    case "DINE_IN":
      return {
        label: "Dine In",
        icon: "restaurant",
        sub: tableName ? `T${tableName.replace(/^T/i, "")}` : "Dine In",
        color: "text-primary",
      };
    case "DELIVERY":
      return {
        label: "Delivery",
        icon: "delivery_dining",
        sub: customerName || "Delivery",
        color: "text-tertiary",
      };
    case "TAKEAWAY":
      return {
        label: "Pick Up",
        icon: "shopping_bag",
        sub: customerName || "Pick Up",
        color: "text-orange-600",
      };
    case "ONLINE":
      return {
        label: "Online",
        icon: "language",
        sub: customerName || "Online",
        color: "text-secondary",
      };
    default:
      return {
        label: "Order",
        icon: "receipt_long",
        sub: "",
        color: "text-on-surface-variant",
      };
  }
}

function VegDot({ isVeg }: { isVeg: boolean }) {
  const color = isVeg ? "border-green-600" : "border-red-600";
  const dot = isVeg ? "bg-green-600" : "bg-red-600";
  return (
    <span
      className={`inline-flex items-center justify-center w-3.5 h-3.5 border-[1.5px] ${color} shrink-0`}
      aria-label={isVeg ? "veg" : "non-veg"}
    >
      <span className={`block w-1.5 h-1.5 rounded-full ${dot}`} />
    </span>
  );
}

function ReadyCheckbox({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className={`flex items-center justify-center w-6 h-6 rounded-md border-2 transition-colors shrink-0 disabled:opacity-50 ${
        on
          ? "bg-green-500 border-green-600 text-white"
          : "bg-white border-outline-variant/60 hover:border-green-500"
      }`}
    >
      {on && (
        <span className="material-symbols-outlined text-base font-black leading-none">
          check
        </span>
      )}
    </button>
  );
}

export function KitchenClient({ initialKOTs }: { initialKOTs: KOTList }) {
  const [kots, setKots] = useState<KOTList>(initialKOTs);
  const [stationFilter, setStationFilter] = useState<string>("ALL");
  const [, setTick] = useState(0);
  const [isPending, startTransition] = useTransition();
  // Track items with an in-flight prepared-state mutation + the optimistic value.
  // When a poll result returns, we keep these items' local preparedAt so the UI
  // doesn't flip back before the server write is visible.
  const pendingItemUpdates = useRef<Map<string, Date | null>>(new Map());

  function mergePendingUpdates(list: KOTList): KOTList {
    if (pendingItemUpdates.current.size === 0) return list;
    return list.map((k) => ({
      ...k,
      items: k.items.map((it) =>
        pendingItemUpdates.current.has(it.id)
          ? { ...it, preparedAt: pendingItemUpdates.current.get(it.id) ?? null }
          : it
      ),
    }));
  }

  // Polling: refresh KOTs every 10 seconds (background, not via startTransition
  // so it doesn't disable the toggle buttons).
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const fresh = await getActiveKOTs();
        setKots(mergePendingUpdates(fresh));
      } catch {
        // silently ignore polling errors
      }
    }, 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer: force re-render every second for elapsed time display
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Aggregate pending items by category (sidebar)
  const pendingByCategory = useMemo(() => {
    const map = new Map<
      string,
      { sortOrder: number; items: Map<string, { name: string; qty: number }> }
    >();
    for (const kot of kots) {
      for (const item of kot.items) {
        if (item.preparedAt) continue;
        const cat = item.menuItem.category.name;
        const catSort = item.menuItem.category.sortOrder ?? 0;
        const name =
          item.menuItem.name +
          (item.variant ? ` (${item.variant.name})` : "");
        if (!map.has(cat)) map.set(cat, { sortOrder: catSort, items: new Map() });
        const group = map.get(cat)!;
        const existing = group.items.get(name);
        if (existing) existing.qty += item.quantity;
        else group.items.set(name, { name, qty: item.quantity });
      }
    }
    return Array.from(map.entries())
      .map(([cat, { sortOrder, items }]) => ({
        category: cat,
        sortOrder,
        items: Array.from(items.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.category.localeCompare(b.category));
  }, [kots]);

  // All categories that appear across active KOTs (for station tabs)
  const allCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const kot of kots) {
      for (const item of kot.items) {
        const cat = item.menuItem.category.name;
        const sort = item.menuItem.category.sortOrder ?? 0;
        if (!map.has(cat)) map.set(cat, sort);
      }
    }
    return Array.from(map.entries())
      .map(([name, sortOrder]) => ({ name, sortOrder }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [kots]);

  const avgMinutes =
    kots.length > 0
      ? Math.round(
          kots.reduce((sum, k) => sum + elapsedMinutes(k.createdAt), 0) /
            kots.length
        )
      : 0;

  const handleOrderReady = useCallback((kotIds: string[]) => {
    startTransition(async () => {
      try {
        await Promise.all(kotIds.map((id) => updateKOTStatus(id, "READY")));
        const fresh = await getActiveKOTs();
        setKots(fresh);
      } catch {
        // ignore
      }
    });
  }, []);

  // Group active KOTs by order (so multiple KOTs for the same table appear in one card)
  const orderGroups = useMemo<OrderGroup[]>(() => {
    const map = new Map<string, OrderGroup>();
    for (const kot of kots) {
      const orderId = kot.order.id;
      const existing = map.get(orderId);
      if (existing) {
        existing.kots.push(kot);
        if (new Date(kot.createdAt) < new Date(existing.earliestCreatedAt)) {
          existing.earliestCreatedAt = kot.createdAt;
        }
      } else {
        map.set(orderId, {
          orderId,
          orderNumber: kot.order.orderNumber,
          order: kot.order,
          kots: [kot],
          earliestCreatedAt: kot.createdAt,
        });
      }
    }
    // Sort each group's KOTs by createdAt ascending (oldest batch first)
    for (const group of map.values()) {
      group.kots.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(a.earliestCreatedAt).getTime() -
        new Date(b.earliestCreatedAt).getTime()
    );
  }, [kots]);

  const handleItemToggle = useCallback(
    (kotId: string, itemId: string, nextPrepared: boolean) => {
      const optimisticValue: Date | null = nextPrepared ? new Date() : null;
      pendingItemUpdates.current.set(itemId, optimisticValue);

      // Optimistic update (local state)
      setKots((prev) =>
        prev.map((k) =>
          k.id !== kotId
            ? k
            : {
                ...k,
                items: k.items.map((it) =>
                  it.id !== itemId ? it : { ...it, preparedAt: optimisticValue },
                ),
              }
        )
      );

      // Fire server action without useTransition so polling/isPending
      // doesn't disable other controls during the round-trip.
      (async () => {
        try {
          await setOrderItemPrepared(itemId, nextPrepared);
          pendingItemUpdates.current.delete(itemId);
        } catch (err) {
          console.error("setOrderItemPrepared failed", err);
          pendingItemUpdates.current.delete(itemId);
          // revert on failure
          setKots((prev) =>
            prev.map((k) =>
              k.id !== kotId
                ? k
                : {
                    ...k,
                    items: k.items.map((it) =>
                      it.id !== itemId
                        ? it
                        : {
                            ...it,
                            preparedAt: nextPrepared ? null : new Date(),
                          }
                    ),
                  }
            )
          );
        }
      })();
    },
    []
  );

  return (
    <div className="flex flex-col h-full -m-8 -mt-6">
      {/* ── Top bar ── */}
      <div className="bg-surface-container-low px-8 py-3 flex items-center justify-between border-b border-outline-variant/20">
        <div className="flex items-center gap-6 text-sm font-semibold text-on-surface-variant">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">
              receipt_long
            </span>
            Active Orders:{" "}
            <span className="text-on-surface font-black">{kots.length}</span>
          </span>
          <span className="w-px h-5 bg-outline-variant/40" />
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-base">
              avg_pace
            </span>
            Avg Time:{" "}
            <span className="text-on-surface font-black">{avgMinutes}m</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-green-600">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          Online
        </div>
      </div>

      {/* ── Main: sidebar + grid ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: aggregated pending items + station filter */}
        <aside className="w-[260px] shrink-0 border-r border-outline-variant/20 bg-surface-container-lowest overflow-y-auto">
          <div className="px-3 pt-3 pb-2 border-b border-outline-variant/15">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 px-2 mb-2">
              Station
            </p>
            <button
              onClick={() => setStationFilter("ALL")}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-bold mb-1 transition-colors ${
                stationFilter === "ALL"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface hover:bg-surface-container"
              }`}
            >
              All stations
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setStationFilter(cat.name)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-bold mb-1 transition-colors ${
                  stationFilter === cat.name
                    ? "bg-primary text-on-primary"
                    : "text-on-surface hover:bg-surface-container"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          {pendingByCategory.length === 0 ? (
            <div className="p-6 text-sm text-on-surface-variant/70 font-semibold">
              Nothing pending
            </div>
          ) : (
            pendingByCategory
              .filter(
                (group) =>
                  stationFilter === "ALL" || group.category === stationFilter
              )
              .map((group) => (
                <div key={group.category} className="py-3">
                  <h4 className="px-4 pb-1 text-[11px] font-black uppercase tracking-wider text-on-surface-variant/70">
                    {group.category}
                  </h4>
                  <ul>
                    {group.items.map((it) => (
                      <li
                        key={it.name}
                        className="flex items-center justify-between px-4 py-1.5 text-sm text-on-surface hover:bg-surface-container-low"
                      >
                        <span className="truncate pr-2">{it.name}</span>
                        <span className="text-xs font-black tabular-nums bg-surface-container text-on-surface px-2 py-0.5 rounded-md shrink-0">
                          {it.qty}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
          )}
        </aside>

        {/* Right: Order card grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface">
          {orderGroups.length === 0 ? (
            <div className="flex items-center justify-center h-full text-on-surface-variant font-semibold text-lg">
              <span className="material-symbols-outlined text-4xl mr-3 opacity-40">
                restaurant
              </span>
              No active orders
            </div>
          ) : (
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
              {orderGroups
                .map((group) => ({
                  group,
                  visibleKots: group.kots
                    .map((kot) => ({
                      ...kot,
                      items: kot.items.filter(
                        (item) =>
                          stationFilter === "ALL" ||
                          item.menuItem.category.name === stationFilter
                      ),
                    }))
                    .filter((kot) => kot.items.length > 0),
                }))
                .filter(({ visibleKots }) => visibleKots.length > 0)
                .map(({ group, visibleKots }) => (
                  <OrderCard
                    key={group.orderId}
                    group={{ ...group, kots: visibleKots }}
                    isPending={isPending}
                    onItemToggle={handleItemToggle}
                    onOrderReady={handleOrderReady}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function itemSignature(item: KOTItem): string {
  const addOns = item.addOns
    .map((a) => a.addOnId)
    .sort()
    .join(",");
  return [
    item.menuItemId,
    item.variantId ?? "",
    item.notes ?? "",
    addOns,
  ].join("|");
}

type ItemGroup = {
  signature: string;
  items: KOTItem[];
  totalQty: number;
  representative: KOTItem;
};

function groupKotItems(items: KOTItem[]): ItemGroup[] {
  const map = new Map<string, ItemGroup>();
  const order: string[] = [];
  for (const item of items) {
    const sig = itemSignature(item);
    const existing = map.get(sig);
    if (existing) {
      existing.items.push(item);
      existing.totalQty += item.quantity;
    } else {
      map.set(sig, {
        signature: sig,
        items: [item],
        totalQty: item.quantity,
        representative: item,
      });
      order.push(sig);
    }
  }
  return order.map((sig) => map.get(sig)!);
}

function OrderCard({
  group,
  isPending,
  onItemToggle,
  onOrderReady,
}: {
  group: OrderGroup;
  isPending: boolean;
  onItemToggle: (kotId: string, itemId: string, next: boolean) => void;
  onOrderReady: (kotIds: string[]) => void;
}) {
  const earliestMinutes = elapsedMinutes(group.earliestCreatedAt);
  const anyPending = group.kots.some((k) => k.status === "PENDING");
  const isLate = anyPending && earliestMinutes > 15;
  const anyPreparing = group.kots.some((k) => k.status === "PREPARING");
  const borderColor = isLate
    ? "border-l-error"
    : anyPreparing
      ? "border-l-tertiary"
      : "border-l-primary";
  const meta = orderTypeMeta(
    group.order.type,
    group.order.table?.name,
    group.order.customer?.name
  );
  const biller = group.order.createdBy?.name ?? "—";
  const allItems = group.kots.flatMap((k) => k.items);
  const allPrepared =
    allItems.length > 0 && allItems.every((i) => i.preparedAt);
  const multipleBatches = group.kots.length > 1;

  return (
    <div
      className={`flex flex-col bg-surface-container-lowest rounded-xl shadow border-l-[5px] ${borderColor} border border-outline-variant/20 overflow-hidden`}
    >
      {/* Running KOT pill */}
      <div className="flex justify-center -mb-2 pt-3">
        <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-md">
          Running KOT
        </span>
      </div>

      {/* Header row */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <span className="font-headline text-xl font-extrabold text-on-surface">
          #{group.orderNumber}
        </span>
        <span
          className={`text-sm font-black tabular-nums px-3 py-1 rounded-lg border border-outline-variant/30 ${
            isLate ? "text-error" : "text-on-surface"
          }`}
        >
          {formatElapsed(group.earliestCreatedAt)}
        </span>
        <div className={`flex flex-col items-end text-xs font-bold ${meta.color}`}>
          <span className="flex items-center gap-1">
            {meta.label}
            <span className="material-symbols-outlined text-base">{meta.icon}</span>
          </span>
          {meta.sub && (
            <span className="text-on-surface-variant font-semibold">{meta.sub}</span>
          )}
        </div>
      </div>

      {/* Biller */}
      <div className="px-4 pb-2 text-xs font-semibold text-on-surface-variant border-b border-outline-variant/15">
        Biller: <span className="text-on-surface">{biller}</span>
      </div>

      {/* Items — aggregated within each KOT, separated across KOTs */}
      <div className="flex-1 px-4 py-3 space-y-3 max-h-[360px] overflow-y-auto">
        {group.kots.map((kot) => {
          const itemGroups = groupKotItems(kot.items);
          return (
            <div key={kot.id} className="space-y-2.5">
              {multipleBatches && (
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">
                  <span>KOT #{kot.kotNumber}</span>
                  <span className="tabular-nums">
                    {formatElapsed(kot.createdAt)}
                  </span>
                </div>
              )}
              {itemGroups.map((ig) => {
                const rep = ig.representative;
                const allDone = ig.items.every((i) => !!i.preparedAt);
                const someDone =
                  !allDone && ig.items.some((i) => !!i.preparedAt);
                const name =
                  rep.menuItem.name +
                  (rep.variant ? ` (${rep.variant.name})` : "");
                const handleGroupToggle = () => {
                  const next = !allDone;
                  for (const it of ig.items) {
                    if (!!it.preparedAt !== next) {
                      onItemToggle(kot.id, it.id, next);
                    }
                  }
                };
                return (
                  <div
                    key={ig.signature}
                    className={allDone ? "opacity-50" : ""}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-black text-on-surface-variant tabular-nums w-7 text-right shrink-0">
                        {ig.totalQty}x
                      </span>
                      <VegDot isVeg={rep.menuItem.isVeg} />
                      <span
                        className={`flex-1 min-w-0 truncate text-sm ${
                          allDone
                            ? "line-through font-medium"
                            : "font-bold text-on-surface"
                        }`}
                      >
                        {name}
                        {someDone && (
                          <span className="ml-1.5 text-[10px] font-bold text-on-surface-variant/70">
                            ({ig.items.filter((i) => i.preparedAt).length}/
                            {ig.items.length} done)
                          </span>
                        )}
                      </span>
                      <ReadyCheckbox on={allDone} onChange={handleGroupToggle} />
                    </div>
                    {rep.notes && (
                      <p className="ml-12 mt-0.5 text-[11px] italic font-semibold text-primary">
                        Note: {rep.notes}
                      </p>
                    )}
                    {rep.addOns.length > 0 && (
                      <div className="ml-12 mt-0.5 flex flex-wrap gap-1">
                        {rep.addOns.map((ao) => (
                          <span
                            key={ao.id}
                            className="text-[10px] font-bold text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded"
                          >
                            + {ao.addOn.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer: Food Ready button */}
      <div className="px-3 pb-3">
        <button
          disabled={isPending}
          onClick={() => onOrderReady(group.kots.map((k) => k.id))}
          className={`w-full py-2.5 rounded-lg text-sm font-black uppercase tracking-wide transition-all border ${
            allPrepared
              ? "bg-green-500 text-white border-green-600 hover:bg-green-600"
              : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
          } disabled:opacity-50`}
        >
          Food Ready
        </button>
      </div>
    </div>
  );
}
