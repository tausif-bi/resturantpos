"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatCurrency, formatRelativeShort } from "@/lib/utils";
import {
  createOrder,
  addItemToOrder,
  updateOrderItemQuantity,
  removeOrderItem,
  cancelOrder,
} from "@/lib/actions/order-actions";
import { createKOT } from "@/lib/actions/kot-actions";
import { createPayment } from "@/lib/actions/payment-actions";
import { CustomerDetailsDialog } from "./customer-details-dialog";
import { formatPhone } from "@/lib/validators/customer";

type TableWithOrders = Awaited<
  ReturnType<typeof import("@/lib/actions/table-actions").getTablesWithActiveOrders>
>[number];
type NonDineOrder = Awaited<
  ReturnType<typeof import("@/lib/actions/order-actions").getActiveNonDineOrders>
>[number];
type Category = Awaited<
  ReturnType<typeof import("@/lib/actions/menu-actions").getCategories>
>[number];
type MenuItem = Awaited<
  ReturnType<typeof import("@/lib/actions/menu-actions").getMenuItems>
>[number];

type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

type Props = {
  tables: TableWithOrders[];
  nonDineOrders: NonDineOrder[];
  categories: Category[];
  menuItems: MenuItem[];
};

type PaymentMode = "CASH" | "CARD" | "UPI";

export function POSClient({ tables, nonDineOrders, categories, menuItems }: Props) {
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCategory, setMenuCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [, setTick] = useState(0);
  const [isPending, startTransition] = useTransition();

  // 1-second tick so the per-item "added X ago" labels stay live.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Reset payment mode whenever the active order changes
  useEffect(() => {
    setPaymentMode(null);
  }, [selectedTableId, selectedOrderId]);

  // Resolve the currently active order from whichever source matches the mode.
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const nonDineActiveOrder =
    orderType === "DINE_IN"
      ? null
      : (nonDineOrders.find((o) => o.id === selectedOrderId) ?? null);
  const activeOrder =
    orderType === "DINE_IN" ? (selectedTable?.orders[0] ?? null) : nonDineActiveOrder;
  const orderId = activeOrder?.id;

  const subtotal = Number(activeOrder?.subtotal ?? 0);
  const taxAmount = Number(activeOrder?.taxAmount ?? 0);
  const discount = Number(activeOrder?.discountAmount ?? 0);
  const totalAmount = Number(activeOrder?.totalAmount ?? 0);
  const totalPaid =
    activeOrder?.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  const unsentItems = activeOrder?.orderItems?.filter((i) => !i.kotId) ?? [];
  const filteredMenuItems = menuCategory
    ? menuItems.filter((i) => i.categoryId === menuCategory)
    : menuItems;

  // ── Search matches MenuItem.name OR shortCode (case-insensitive).
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 1) return [];
    const scored: { item: MenuItem; score: number }[] = [];
    for (const item of menuItems) {
      if (!item.isAvailable) continue;
      const name = item.name.toLowerCase();
      const code = (item.shortCode ?? "").toLowerCase();
      let score = -1;
      if (code && code === q) score = 100;
      else if (code && code.startsWith(q)) score = 80;
      else if (name.startsWith(q)) score = 60;
      else if (code && code.includes(q)) score = 40;
      else if (name.includes(q)) score = 20;
      if (score >= 0) scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
    return scored.slice(0, 8).map((s) => s.item);
  }, [search, menuItems]);

  function clearSelection() {
    setSelectedTableId(null);
    setSelectedOrderId(null);
    setMenuOpen(false);
    setSearch("");
    setPaymentMode(null);
  }

  function switchOrderType(type: OrderType) {
    setOrderType(type);
    clearSelection();
  }

  function handleSeatTable(tableId: string) {
    startTransition(async () => {
      try {
        await createOrder({ tableId, type: "DINE_IN" });
        setSelectedTableId(tableId);
        toast.success("Table seated — order created");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to seat table");
      }
    });
  }

  function handleStartNonDineOrder() {
    setCustomerDialogOpen(true);
  }

  function handleAddItem(item: MenuItem, variantId?: string) {
    if (!orderId) {
      toast.info(
        orderType === "DINE_IN"
          ? "Select or seat a table first"
          : "Start a new order first"
      );
      return;
    }
    startTransition(async () => {
      try {
        await addItemToOrder({
          orderId,
          menuItemId: item.id,
          variantId,
          quantity: 1,
          addOnIds: [],
        });
        setSearch("");
        const label = variantId
          ? `${item.name} (${item.variants.find((v) => v.id === variantId)?.name ?? ""})`
          : item.name;
        toast.success(`Added ${label}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add item");
      }
    });
  }

  function handleUpdateQty(orderItemId: string, qty: number) {
    startTransition(async () => {
      try {
        if (qty <= 0) {
          await removeOrderItem(orderItemId);
        } else {
          await updateOrderItemQuantity(orderItemId, qty);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update");
      }
    });
  }

  function handleSendKOT() {
    if (!orderId || unsentItems.length === 0) return;
    startTransition(async () => {
      try {
        await createKOT(orderId, unsentItems.map((i) => i.id));
        toast.success(`KOT sent with ${unsentItems.length} item(s)`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to send KOT");
      }
    });
  }

  function handleSendItemKOT(orderItemId: string, itemName: string) {
    if (!orderId) return;
    startTransition(async () => {
      try {
        await createKOT(orderId, [orderItemId]);
        toast.success(`KOT sent for ${itemName}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to send KOT");
      }
    });
  }

  function handleSettle() {
    if (!orderId || totalAmount <= 0) return;
    if (!paymentMode) {
      toast.info("Select a payment method first");
      return;
    }
    const remaining = totalAmount - totalPaid;
    if (remaining <= 0) return;

    startTransition(async () => {
      try {
        await createPayment({ orderId, mode: paymentMode, amount: remaining });
        clearSelection();
        toast.success("Payment recorded — order completed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Payment failed");
      }
    });
  }

  function handleCancelOrder() {
    if (!orderId) return;
    const msg = orderType === "DINE_IN"
      ? "Cancel this order? This will free the table."
      : "Cancel this order?";
    if (!confirm(msg)) return;
    startTransition(async () => {
      try {
        await cancelOrder(orderId);
        clearSelection();
        toast.success("Order cancelled");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to cancel");
      }
    });
  }

  const orderTypeLabel =
    orderType === "DINE_IN" ? "Dine In" : orderType === "TAKEAWAY" ? "Pick Up" : "Delivery";

  return (
    <div className="flex gap-0 -m-8 h-[calc(100vh-4rem)]">
      {/* LEFT — Floor Map / Order Queue / Menu Selector */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Order Type Radio */}
        <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-xl shadow-sm mb-6 w-fit">
          {(["DINE_IN", "TAKEAWAY", "DELIVERY"] as const).map((t) => {
            const label = t === "DINE_IN" ? "Dine In" : t === "TAKEAWAY" ? "Pick Up" : "Delivery";
            const icon = t === "DINE_IN" ? "restaurant" : t === "TAKEAWAY" ? "takeout_dining" : "delivery_dining";
            const active = orderType === t;
            return (
              <button
                key={t}
                onClick={() => switchOrderType(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  active
                    ? "primary-gradient text-white shadow"
                    : "text-secondary hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-base">{icon}</span>
                {label}
              </button>
            );
          })}
        </div>

        {!menuOpen ? (
          <>
            {orderType === "DINE_IN" ? (
              <DineInGrid
                tables={tables}
                selectedTableId={selectedTableId}
                isPending={isPending}
                onSelectTable={(id) => setSelectedTableId(id)}
                onSeat={handleSeatTable}
                onOpenMenu={(id) => {
                  setSelectedTableId(id);
                  setMenuOpen(true);
                  setMenuCategory(null);
                }}
              />
            ) : (
              <NonDineQueue
                orderType={orderType}
                orders={nonDineOrders.filter((o) => o.type === orderType)}
                selectedOrderId={selectedOrderId}
                isPending={isPending}
                onSelect={(id) => setSelectedOrderId(id)}
                onStart={handleStartNonDineOrder}
              />
            )}

            {/* Quick Menu Access */}
            <div className="mt-10">
              <h3 className="font-headline text-lg font-extrabold text-on-surface mb-4">
                Quick Menu Access
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (!activeOrder) {
                        toast.info(
                          orderType === "DINE_IN"
                            ? "Select or seat a table first"
                            : "Start a new order first"
                        );
                        return;
                      }
                      setMenuCategory(cat.id);
                      setMenuOpen(true);
                    }}
                    className="flex-shrink-0 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-5 py-3.5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <span className="material-symbols-outlined text-xl text-primary">restaurant</span>
                    <div className="text-left">
                      <p className="text-sm font-bold text-on-surface">{cat.name}</p>
                      <p className="text-[10px] text-secondary">{cat._count.menuItems} items</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Menu Item Selector */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-on-surface">
                  Add Items to Order
                </h2>
                <p className="text-secondary text-sm">
                  {orderType === "DINE_IN"
                    ? `${selectedTable?.name} — ${activeOrder?.orderNumber}`
                    : `${orderTypeLabel} — ${activeOrder?.orderNumber}`}
                </p>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-xl text-sm font-bold hover:bg-surface-dim transition-all"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setMenuCategory(null)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
                  !menuCategory
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-secondary hover:text-on-surface"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setMenuCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
                    menuCategory === cat.id
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-high text-secondary hover:text-on-surface"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Item Grid */}
            <div className="grid grid-cols-3 gap-4">
              {filteredMenuItems
                .filter((i) => i.isAvailable)
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.isVeg ? (
                          <span className="w-4 h-4 border border-green-600 flex items-center justify-center rounded-sm shrink-0">
                            <span className="w-2 h-2 rounded-full bg-green-600" />
                          </span>
                        ) : (
                          <span className="w-4 h-4 border border-red-600 flex items-center justify-center rounded-sm shrink-0">
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                          </span>
                        )}
                        <h4 className="font-bold text-sm text-on-surface truncate">{item.name}</h4>
                      </div>
                      {item.shortCode && (
                        <span className="text-[9px] font-mono font-bold text-secondary bg-surface-container px-1.5 py-0.5 rounded ml-2 shrink-0">
                          {item.shortCode}
                        </span>
                      )}
                    </div>
                    <p className="text-primary font-black text-sm mb-3">
                      {formatCurrency(item.basePrice.toString())}
                    </p>

                    {item.variants.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.variants.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => handleAddItem(item, v.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-surface-container-high text-xs font-bold rounded-lg hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50"
                          >
                            {v.name} ({formatCurrency(v.price.toString())})
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddItem(item)}
                        disabled={isPending}
                        className="w-full py-2 bg-surface-container-high text-xs font-bold rounded-lg hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50"
                      >
                        {isPending ? "Adding..." : "Add to Order"}
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — Order Sidebar */}
      <div className="w-[440px] bg-surface-container border-l border-outline-variant/30 shadow-[-4px_0_24px_rgba(0,0,0,0.06)] flex flex-col">
        {activeOrder ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/20">
              <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-1">
                Current Active Order
              </p>
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-2xl font-extrabold text-on-surface">
                  {orderType === "DINE_IN"
                    ? selectedTable?.name
                    : (nonDineActiveOrder?.customer?.name ?? orderTypeLabel)}
                </h2>
                <span className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                  {activeOrder.type.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-secondary mt-1">
                {activeOrder.orderNumber} · Server: {activeOrder.createdBy.name}
              </p>
              {nonDineActiveOrder?.customer && (
                <div className="mt-3 pt-3 border-t border-outline-variant/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-on-surface">
                    <span className="material-symbols-outlined text-sm text-secondary">call</span>
                    <span className="font-mono font-semibold">{formatPhone(nonDineActiveOrder.customer.phone)}</span>
                  </div>
                  {nonDineActiveOrder.customer.locality && (
                    <div className="flex items-center gap-1.5 text-xs text-secondary">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span className="font-medium">{nonDineActiveOrder.customer.locality}</span>
                    </div>
                  )}
                  {nonDineActiveOrder.customer.address && (
                    <p className="text-[11px] text-secondary italic pl-5">
                      {nonDineActiveOrder.customer.address}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Item Search */}
            <div className="px-6 pt-4 pb-3 border-b border-outline-variant/20 relative">
              <div className="flex items-center gap-2 bg-surface-container-lowest rounded-xl px-3 py-2 shadow-sm">
                <span className="material-symbols-outlined text-secondary text-lg">search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Add item — type name or short code (e.g. VMS)"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
                  autoComplete="off"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-secondary hover:text-on-surface"
                    title="Clear"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>
              {search.length > 0 && (
                <div className="absolute left-6 right-6 mt-1 bg-white border border-outline-variant/30 rounded-xl shadow-xl z-30 max-h-80 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <p className="p-3 text-xs text-secondary text-center italic">
                      No items match &quot;{search}&quot;
                    </p>
                  ) : (
                    searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 hover:bg-surface-container-low cursor-pointer border-b border-outline-variant/10 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.isVeg ? (
                              <span className="w-3 h-3 border border-green-600 flex items-center justify-center rounded-sm shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                              </span>
                            ) : (
                              <span className="w-3 h-3 border border-red-600 flex items-center justify-center rounded-sm shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              </span>
                            )}
                            <span className="text-sm font-semibold text-on-surface truncate">
                              {item.name}
                            </span>
                            {item.shortCode && (
                              <span className="text-[9px] font-mono font-bold text-secondary bg-surface-container px-1.5 py-0.5 rounded shrink-0">
                                {item.shortCode}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-black text-primary shrink-0">
                            {formatCurrency(item.basePrice.toString())}
                          </span>
                        </div>
                        {item.variants.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.variants.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => handleAddItem(item, v.id)}
                                disabled={isPending}
                                className="px-2 py-0.5 bg-surface-container-high text-[10px] font-bold rounded hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50"
                              >
                                {v.name} · {formatCurrency(v.price.toString())}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddItem(item)}
                            disabled={isPending}
                            className="mt-1.5 text-[10px] font-bold text-tertiary hover:underline disabled:opacity-50"
                          >
                            + Add to order
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {activeOrder.orderItems.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  <span className="material-symbols-outlined text-3xl text-stone-300">restaurant_menu</span>
                  <p className="text-sm mt-2">No items yet. Search above or open the menu.</p>
                </div>
              ) : (
                activeOrder.orderItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex gap-3 bg-surface-container-lowest p-3 rounded-xl ${
                      !item.kotId ? "border-l-4 border-primary" : ""
                    }`}
                  >
                    <div className="h-12 w-12 rounded-lg bg-stone-100 flex-shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-stone-400 text-lg">lunch_dining</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-on-surface truncate">{item.menuItem.name}</p>
                        <p className="text-sm font-black text-on-surface shrink-0">
                          {formatCurrency(item.totalPrice.toString())}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] mt-0.5">
                        {item.variant && (
                          <span className="text-tertiary font-semibold">{item.variant.name}</span>
                        )}
                        <span className="flex items-center gap-0.5 text-secondary">
                          <span className="material-symbols-outlined text-[11px]">schedule</span>
                          {formatRelativeShort(item.createdAt)}
                        </span>
                        {!item.kotId ? (
                          <span className="text-primary font-black uppercase">Unsent</span>
                        ) : (
                          <span className="text-green-700 font-black uppercase">Sent</span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-secondary italic truncate">{item.notes}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <button
                          onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                          disabled={isPending}
                          className="h-6 w-6 rounded-md bg-surface-container-highest flex items-center justify-center hover:bg-surface-dim transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="text-sm font-black text-on-surface w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                          disabled={isPending}
                          className="h-6 w-6 rounded-md bg-surface-container-highest flex items-center justify-center hover:bg-surface-dim transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                        {!item.kotId && (
                          <button
                            onClick={() => handleSendItemKOT(item.id, item.menuItem.name)}
                            disabled={isPending}
                            className="ml-auto flex items-center gap-1 px-2 h-6 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-on-primary text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                            title="Fire this item to the kitchen now"
                          >
                            <span className="material-symbols-outlined text-[12px]">send</span>
                            Send
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Billing Footer */}
            <div className="border-t border-outline-variant/20 p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Subtotal</span>
                  <span className="font-semibold text-on-surface">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Tax</span>
                  <span className="font-semibold text-on-surface">{formatCurrency(taxAmount)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary">Discount</span>
                    <span className="font-semibold text-tertiary">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="border-t border-outline-variant/20 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-on-surface">Total</span>
                  <span className="font-headline text-2xl font-black text-on-surface">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSendKOT}
                  disabled={isPending || unsentItems.length === 0}
                  className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    unsentItems.length > 0
                      ? "primary-gradient text-white shadow hover:shadow-md"
                      : "bg-surface-container-highest text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Send KOT ({unsentItems.length})
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1.5 bg-surface-container-highest text-error text-xs font-bold py-2.5 rounded-lg hover:bg-error/10 transition-colors disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Cancel
                </button>
              </div>

              {/* Payment Methods (select one, then settle) */}
              <div className="flex gap-2">
                {(["CASH", "CARD", "UPI"] as const).map((mode) => {
                  const selected = paymentMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() =>
                        setPaymentMode(selected ? null : mode)
                      }
                      disabled={isPending || totalAmount <= 0}
                      className={`flex-1 flex flex-col items-center gap-1 border py-2.5 rounded-lg transition-all disabled:opacity-40 relative ${
                        selected
                          ? "bg-primary/10 border-primary text-primary shadow-sm"
                          : "bg-surface-container-lowest border-outline-variant/30 text-secondary hover:text-primary hover:border-primary/30"
                      }`}
                      aria-pressed={selected}
                    >
                      <span
                        className={`absolute top-1.5 right-1.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          selected
                            ? "bg-primary border-primary"
                            : "bg-white border-outline-variant/50"
                        }`}
                      >
                        {selected && (
                          <span className="material-symbols-outlined text-white text-[12px] leading-none font-black">
                            check
                          </span>
                        )}
                      </span>
                      <span className="material-symbols-outlined text-lg">
                        {mode === "CASH"
                          ? "payments"
                          : mode === "CARD"
                            ? "credit_card"
                            : "qr_code_2"}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {mode}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSettle}
                disabled={isPending || totalAmount <= 0 || !paymentMode}
                className="w-full primary-gradient text-on-primary font-bold py-3.5 rounded-xl text-sm shadow-lg hover:shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">
                  check_circle
                </span>
                {paymentMode
                  ? `Settle ${paymentMode} — ${formatCurrency(totalAmount)}`
                  : `Select payment method to settle`}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <span className="material-symbols-outlined text-5xl text-stone-300">point_of_sale</span>
              <p className="font-headline font-bold text-on-surface mt-4">
                {orderType === "DINE_IN" ? "No Table Selected" : `No ${orderTypeLabel} Order Selected`}
              </p>
              <p className="text-sm text-secondary mt-1">
                {orderType === "DINE_IN"
                  ? "Select an occupied table to view its order, or tap an available table to seat guests."
                  : `Click \"New ${orderTypeLabel} Order\" to start billing, or select an existing order from the queue.`}
              </p>
            </div>
          </div>
        )}
      </div>

      {orderType !== "DINE_IN" && (
        <CustomerDetailsDialog
          open={customerDialogOpen}
          orderType={orderType}
          onOpenChange={setCustomerDialogOpen}
          onCreated={(id) => setSelectedOrderId(id)}
        />
      )}
    </div>
  );
}

// ────────────────────────── sub-components ──────────────────────────

function DineInGrid({
  tables,
  selectedTableId,
  isPending,
  onSelectTable,
  onSeat,
  onOpenMenu,
}: {
  tables: TableWithOrders[];
  selectedTableId: string | null;
  isPending: boolean;
  onSelectTable: (id: string) => void;
  onSeat: (id: string) => void;
  onOpenMenu: (id: string) => void;
}) {
  return (
    <>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            Main Dining Hall
          </h1>
          <p className="text-secondary mt-1 text-sm font-medium">
            {tables.filter((t) => t.status === "OCCUPIED").length}/{tables.length} Tables Occupied
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-tertiary shadow-[0_0_8px_rgba(0,94,162,0.4)]" />
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-primary shadow-[0_0_8px_rgba(172,45,0,0.4)]" />
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Occupied</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {tables.map((table) => {
          const order = table.orders[0];
          const isOccupied = table.status === "OCCUPIED" && order;
          const isSelected = table.id === selectedTableId;

          return (
            <div
              key={table.id}
              onClick={() => {
                if (isOccupied) onSelectTable(table.id);
              }}
              className={`bg-surface-container-lowest p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-all cursor-pointer ${
                isOccupied ? "border-primary" : "border-tertiary"
              } ${isSelected ? "ring-2 ring-primary/30" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-headline text-2xl font-extrabold text-on-surface">{table.name}</h3>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                    isOccupied ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                  }`}
                >
                  {isOccupied ? `PAX ${table.capacity}` : `${table.capacity} Seats`}
                </span>
              </div>

              {isOccupied ? (
                <>
                  <p className="text-xs text-secondary mb-1">Server: {order.createdBy.name}</p>
                  <p className="text-xs text-secondary mb-4">
                    {order.orderNumber} · {order.orderItems.length} items
                  </p>
                  <p className="text-xl font-black font-headline text-on-surface mb-4">
                    {formatCurrency(order.totalAmount.toString())}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMenu(table.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-surface-container-highest text-on-surface text-xs font-bold py-2 rounded-lg hover:bg-surface-dim transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      Add Item
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTable(table.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-on-primary text-xs font-bold py-2 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-sm">receipt_long</span>
                      Bill Now
                    </button>
                  </div>
                </>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeat(table.id);
                  }}
                  className="flex-1 flex items-center justify-center border-2 border-dashed border-outline-variant/40 rounded-lg py-8 mt-2 hover:border-tertiary/60 hover:bg-tertiary/5 transition-all group"
                >
                  <div className="text-center">
                    <span className="material-symbols-outlined text-3xl text-outline-variant group-hover:text-tertiary transition-colors">
                      touch_app
                    </span>
                    <p className="text-xs font-bold text-secondary mt-1 group-hover:text-tertiary transition-colors">
                      {isPending ? "Seating..." : "Tap to Seat"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function NonDineQueue({
  orderType,
  orders,
  selectedOrderId,
  isPending,
  onSelect,
  onStart,
}: {
  orderType: "TAKEAWAY" | "DELIVERY";
  orders: NonDineOrder[];
  selectedOrderId: string | null;
  isPending: boolean;
  onSelect: (id: string) => void;
  onStart: () => void;
}) {
  const label = orderType === "TAKEAWAY" ? "Pick Up" : "Delivery";
  const icon = orderType === "TAKEAWAY" ? "takeout_dining" : "delivery_dining";

  return (
    <>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            {label} Orders
          </h1>
          <p className="text-secondary mt-1 text-sm font-medium">
            {orders.length} active {label.toLowerCase()} order{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={onStart}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-3 primary-gradient rounded-xl font-bold text-white shadow-xl hover:shadow-2xl transition-shadow disabled:opacity-50"
        >
          <span className="material-symbols-outlined">add_circle</span>
          New {label} Order
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-stone-300 mb-4">{icon}</span>
          <p className="font-headline font-bold text-on-surface text-lg">No active {label.toLowerCase()} orders</p>
          <p className="text-secondary text-sm mt-2">
            Click &quot;New {label} Order&quot; above to start one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {orders.map((order) => {
            const isSelected = order.id === selectedOrderId;
            return (
              <div
                key={order.id}
                onClick={() => onSelect(order.id)}
                className={`bg-surface-container-lowest p-6 rounded-xl shadow-sm border-l-4 border-primary hover:shadow-md transition-all cursor-pointer ${
                  isSelected ? "ring-2 ring-primary/30" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-headline text-lg font-extrabold text-on-surface truncate">
                    {order.orderNumber}
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {order.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-on-surface mb-0.5 truncate">
                  {order.customer?.name || "Walk-in"}
                </p>
                {order.customer?.phone && (
                  <p className="text-[11px] text-secondary font-mono mb-1">
                    +91 {order.customer.phone}
                  </p>
                )}
                {order.customer?.locality && (
                  <div className="flex items-center gap-1 text-[11px] text-secondary mb-1 truncate">
                    <span className="material-symbols-outlined text-xs">location_on</span>
                    <span className="truncate">{order.customer.locality}</span>
                  </div>
                )}
                <p className="text-xs text-secondary mb-3">
                  Server: {order.createdBy.name} · {order.orderItems.length} items
                </p>
                <p className="text-xl font-black font-headline text-on-surface">
                  {formatCurrency(order.totalAmount.toString())}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
