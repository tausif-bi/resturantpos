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
  updateOrderMeta,
  setOrderRoundOff,
  setOrderComplimentary,
  setOrderCustomerPaid,
  markOrderPrinted,
  moveOrderToTable,
} from "@/lib/actions/order-actions";
import { createKOT } from "@/lib/actions/kot-actions";
import { createPayment } from "@/lib/actions/payment-actions";
import { CustomerDetailsDialog } from "./customer-details-dialog";
import { formatPhone } from "@/lib/validators/customer";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
type Staff = Awaited<
  ReturnType<typeof import("@/lib/actions/order-actions").getAssignableStaff>
>[number];

type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

type Props = {
  tables: TableWithOrders[];
  nonDineOrders: NonDineOrder[];
  categories: Category[];
  menuItems: MenuItem[];
  staff: Staff[];
};

type PaymentMode = "CASH" | "CARD" | "UPI" | "WALLET" | "SPLIT";

export function POSClient({ tables, nonDineOrders, categories, menuItems, staff }: Props) {
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCategory, setMenuCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [, setTick] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Cart meta drafts — reset to activeOrder values whenever selection changes.
  const [personsDraft, setPersonsDraft] = useState("");
  const [assignedToDraft, setAssignedToDraft] = useState<string>("");
  const [notesDraft, setNotesDraft] = useState("");
  const [roundOffDraft, setRoundOffDraft] = useState("");
  const [customerPaidDraft, setCustomerPaidDraft] = useState("");
  const [lastSyncedOrderId, setLastSyncedOrderId] = useState<string | null>(null);
  const [otherPaymentOpen, setOtherPaymentOpen] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState(0);

  // Floor-map mini-panel state (Phase 4).
  const [quickSearch, setQuickSearch] = useState("");
  const [queueTab, setQueueTab] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY" | "KOT">("DINE_IN");
  const [moveKOTMode, setMoveKOTMode] = useState(false);
  const [moveSourceOrderId, setMoveSourceOrderId] = useState<string | null>(null);
  const [activeOrdersSheetOpen, setActiveOrdersSheetOpen] = useState(false);

  // Open the laptop cart slide-over only on screens below the 2xl breakpoint;
  // on desktop the docked cart is always visible so this is a no-op.
  function openCartSheetIfLaptop() {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 1535.98px)").matches) {
      setCartSheetOpen(true);
    }
  }

  // 1-second tick so the per-item "added X ago" labels stay live.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Resolve the currently active order from whichever source matches the mode.
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const nonDineActiveOrder =
    orderType === "DINE_IN"
      ? null
      : (nonDineOrders.find((o) => o.id === selectedOrderId) ?? null);
  const activeOrder =
    orderType === "DINE_IN" ? (selectedTable?.orders[0] ?? null) : nonDineActiveOrder;
  const orderId = activeOrder?.id;
  // Below 2xl: when an order is selected and the menu picker is closed, the
  // cart takes over the main area (floor map + quick-search panel hide so the
  // cart can use the full width to the right of the global sidebar).
  const cartTakeoverActive = Boolean(activeOrder) && !menuOpen;

  // Reset draft fields whenever the active order changes (React 19 pattern:
  // adjust state during render, guarded by a "previous id" check to avoid a loop).
  const currentOrderId = activeOrder?.id ?? null;
  if (currentOrderId !== lastSyncedOrderId) {
    setLastSyncedOrderId(currentOrderId);
    setPersonsDraft(
      activeOrder?.persons != null ? String(activeOrder.persons) : ""
    );
    setAssignedToDraft(activeOrder?.assignedToId ?? "");
    setNotesDraft(activeOrder?.notes ?? "");
    const ro = Number(activeOrder?.roundOff ?? 0);
    setRoundOffDraft(ro === 0 ? "" : String(ro));
    setCustomerPaidDraft(
      activeOrder?.customerPaid != null
        ? String(Number(activeOrder.customerPaid))
        : ""
    );
  }

  // ── Combined active-order queue feeding the mini-panel + Sheet.
  const dineInActiveOrders = useMemo(
    () =>
      tables
        .filter((t) => t.orders.length > 0)
        .map((t) => ({ table: t, order: t.orders[0] })),
    [tables]
  );
  const activeOrdersQueue = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    let list:
      | {
          id: string;
          orderNumber: string;
          label: string;
          subLabel: string;
          totalAmount: number;
          tableId: string | null;
          orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
          customerPhone?: string;
        }[];
    if (queueTab === "KOT") {
      // Surface only orders that have at least one fired KOT (= a printedAt stamp).
      const all = [
        ...dineInActiveOrders.map(({ table, order }) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          label: table.name,
          subLabel: `${order.orderItems.length} items`,
          totalAmount: Number(order.totalAmount),
          tableId: table.id,
          orderType: "DINE_IN" as const,
          printedAt: order.printedAt,
        })),
        ...nonDineOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          label: o.customer?.name ?? (o.type === "TAKEAWAY" ? "Pick Up" : "Delivery"),
          subLabel: `${o.orderItems.length} items`,
          totalAmount: Number(o.totalAmount),
          tableId: null,
          orderType: o.type as "TAKEAWAY" | "DELIVERY",
          printedAt: o.printedAt,
          customerPhone: o.customer?.phone,
        })),
      ];
      list = all.filter((o) => o.printedAt != null);
    } else if (queueTab === "DINE_IN") {
      list = dineInActiveOrders.map(({ table, order }) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        label: table.name,
        subLabel: `${order.orderItems.length} items`,
        totalAmount: Number(order.totalAmount),
        tableId: table.id,
        orderType: "DINE_IN" as const,
      }));
    } else {
      list = nonDineOrders
        .filter((o) => o.type === queueTab)
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          label: o.customer?.name ?? (o.type === "TAKEAWAY" ? "Pick Up" : "Delivery"),
          subLabel: o.customer?.phone ? formatPhone(o.customer.phone) : `${o.orderItems.length} items`,
          totalAmount: Number(o.totalAmount),
          tableId: null,
          orderType: o.type as "TAKEAWAY" | "DELIVERY",
          customerPhone: o.customer?.phone,
        }));
    }
    if (q.length > 0) {
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.label.toLowerCase().includes(q) ||
          (o.customerPhone ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [queueTab, quickSearch, dineInActiveOrders, nonDineOrders]);

  const subtotal = Number(activeOrder?.subtotal ?? 0);
  const taxAmount = Number(activeOrder?.taxAmount ?? 0);
  const discount = Number(activeOrder?.discountAmount ?? 0);
  const totalAmount = Number(activeOrder?.totalAmount ?? 0);
  const roundOff = Number(activeOrder?.roundOff ?? 0);
  const totalPaid =
    activeOrder?.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const totalQty =
    activeOrder?.orderItems?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  const customerPaidValue = Number(customerPaidDraft) || 0;
  const returnToCustomer =
    customerPaidValue > 0 ? Math.max(0, customerPaidValue - totalAmount) : 0;

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

  // Reset the keyboard highlight to the top whenever the result set changes.
  useEffect(() => {
    setSearchHighlight(0);
  }, [searchResults]);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (searchResults.length === 0) {
      if (e.key === "Escape") setSearch("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchHighlight((h) => (h + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchHighlight((h) => (h - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = searchResults[searchHighlight];
      if (!item) return;
      const variantId = item.variants.length > 0 ? item.variants[0].id : undefined;
      handleAddItem(item, variantId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearch("");
    }
  }

  function clearSelection() {
    setSelectedTableId(null);
    setSelectedOrderId(null);
    setMenuOpen(false);
    setSearch("");
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
        openCartSheetIfLaptop();
        toast.success("Table seated — order created");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to seat table");
      }
    });
  }

  // Pick an order from the mini-panel queue (any type). Routes selection to
  // the right state slot based on the order's type.
  function handleSelectFromQueue(entry: { id: string; tableId: string | null; orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY" }) {
    if (entry.orderType === "DINE_IN") {
      if (orderType !== "DINE_IN") setOrderType("DINE_IN");
      setSelectedTableId(entry.tableId);
      setSelectedOrderId(null);
    } else {
      if (orderType !== entry.orderType) setOrderType(entry.orderType);
      setSelectedOrderId(entry.id);
      setSelectedTableId(null);
    }
    setActiveOrdersSheetOpen(false);
    openCartSheetIfLaptop();
  }

  // Tap-tap handler for Move KOT mode: first click selects the source order,
  // second click on an empty table moves the source order there.
  function handleMoveKOTTableClick(
    table: TableWithOrders,
    isOccupied: boolean
  ) {
    if (moveSourceOrderId == null) {
      if (!isOccupied) {
        toast.info("Pick an occupied table to move from");
        return;
      }
      const order = table.orders[0];
      if (!order) return;
      setMoveSourceOrderId(order.id);
      toast.info(`Move from ${table.name} — tap an empty table`);
      return;
    }
    if (isOccupied) {
      toast.error("Destination must be empty");
      return;
    }
    const sourceId = moveSourceOrderId;
    setMoveSourceOrderId(null);
    startTransition(async () => {
      try {
        await moveOrderToTable(sourceId, table.id);
        toast.success(`Moved to ${table.name}`);
        setMoveKOTMode(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to move");
      }
    });
  }

  function toggleMoveKOTMode() {
    if (moveKOTMode) {
      setMoveSourceOrderId(null);
      setMoveKOTMode(false);
      return;
    }
    setMoveKOTMode(true);
    setMoveSourceOrderId(null);
    toast.info("Move mode on — pick an occupied table");
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

  function handleSavePersons() {
    if (!orderId) return;
    const trimmed = personsDraft.trim();
    const next = trimmed === "" ? null : Math.max(0, Math.min(99, parseInt(trimmed, 10) || 0));
    const current = activeOrder?.persons ?? null;
    if (next === current) return;
    startTransition(async () => {
      try {
        await updateOrderMeta({
          orderId,
          persons: next,
          assignedToId: activeOrder?.assignedToId ?? null,
          notes: activeOrder?.notes ?? null,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save persons");
      }
    });
  }

  function handleSaveAssignee(nextId: string) {
    if (!orderId) return;
    const next = nextId === "" ? null : nextId;
    if ((activeOrder?.assignedToId ?? null) === next) return;
    setAssignedToDraft(nextId);
    startTransition(async () => {
      try {
        await updateOrderMeta({
          orderId,
          persons: activeOrder?.persons ?? null,
          assignedToId: next,
          notes: activeOrder?.notes ?? null,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to assign");
      }
    });
  }

  function handleSaveNotes() {
    if (!orderId) return;
    const next = notesDraft.trim() === "" ? null : notesDraft;
    if ((activeOrder?.notes ?? null) === next) return;
    startTransition(async () => {
      try {
        await updateOrderMeta({
          orderId,
          persons: activeOrder?.persons ?? null,
          assignedToId: activeOrder?.assignedToId ?? null,
          notes: next,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save note");
      }
    });
  }

  function handleSaveRoundOff() {
    if (!orderId) return;
    const trimmed = roundOffDraft.trim();
    const raw = trimmed === "" ? 0 : Number(trimmed);
    const next = Number.isFinite(raw) ? Math.max(-99, Math.min(99, raw)) : 0;
    if (Number(activeOrder?.roundOff ?? 0) === next) return;
    startTransition(async () => {
      try {
        await setOrderRoundOff({ orderId, roundOff: next });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save round off");
      }
    });
  }

  function handleSaveCustomerPaid() {
    if (!orderId) return;
    const trimmed = customerPaidDraft.trim();
    const raw = trimmed === "" ? null : Number(trimmed);
    const next = raw == null ? null : Math.max(0, raw);
    const current = activeOrder?.customerPaid != null ? Number(activeOrder.customerPaid) : null;
    if (current === next) return;
    startTransition(async () => {
      try {
        await setOrderCustomerPaid({ orderId, customerPaid: next });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save");
      }
    });
  }

  function handleToggleComplimentary() {
    if (!orderId) return;
    const next = !(activeOrder?.complimentary ?? false);
    if (next && !confirm("Mark this order as complimentary? Total will be zeroed out.")) return;
    startTransition(async () => {
      try {
        await setOrderComplimentary({ orderId, complimentary: next });
        toast.success(next ? "Marked complimentary" : "Complimentary removed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update");
      }
    });
  }

  // Open a print preview window with a basic bill/KOT template.
  function openPrintWindow(kind: "bill" | "kot") {
    if (!activeOrder) return;
    const win = window.open("", "_blank", "width=380,height=600");
    if (!win) {
      toast.error("Pop-up blocked. Allow pop-ups to print.");
      return;
    }
    const itemsForPrint =
      kind === "kot"
        ? activeOrder.orderItems.filter((i) => !!i.kotId)
        : activeOrder.orderItems;
    const rows = itemsForPrint
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.menuItem.name)}${i.variant ? ` (${escapeHtml(i.variant.name)})` : ""}</td><td style="text-align:center">${i.quantity}</td>${kind === "bill" ? `<td style="text-align:right">${Number(i.totalPrice).toFixed(2)}</td>` : ""}</tr>`
      )
      .join("");
    const title = kind === "kot" ? "Kitchen Order Ticket" : "Bill";
    const tableLabel =
      activeOrder.type === "DINE_IN" ? selectedTable?.name ?? "" : activeOrder.type.replace("_", " ");
    const footer =
      kind === "bill"
        ? `<table style="width:100%;font-size:12px;margin-top:8px"><tr><td>Subtotal</td><td style="text-align:right">${subtotal.toFixed(2)}</td></tr><tr><td>Tax</td><td style="text-align:right">${taxAmount.toFixed(2)}</td></tr>${discount ? `<tr><td>Discount</td><td style="text-align:right">-${discount.toFixed(2)}</td></tr>` : ""}${roundOff ? `<tr><td>Round Off</td><td style="text-align:right">${roundOff.toFixed(2)}</td></tr>` : ""}<tr style="font-weight:bold;border-top:1px dashed #333"><td>Total</td><td style="text-align:right">${totalAmount.toFixed(2)}</td></tr></table>`
        : "";
    win.document.write(`<!doctype html><html><head><title>${title} — ${escapeHtml(activeOrder.orderNumber)}</title><style>body{font-family:ui-monospace,monospace;padding:12px;font-size:12px;color:#000}h1{font-size:14px;margin:0 0 4px}table{width:100%;border-collapse:collapse}td{padding:2px 0}thead td{border-bottom:1px dashed #333;font-weight:bold}.meta{margin-bottom:8px;color:#444}</style></head><body><h1>${title}</h1><div class="meta">${escapeHtml(activeOrder.orderNumber)} · ${escapeHtml(tableLabel)}<br/>${new Date().toLocaleString()}</div><table><thead><tr><td>Item</td><td style="text-align:center">Qty</td>${kind === "bill" ? `<td style="text-align:right">Amt</td>` : ""}</tr></thead><tbody>${rows}</tbody></table>${footer}<script>window.onload=function(){window.print();}</script></body></html>`);
    win.document.close();
  }

  function handleSave() {
    if (!orderId) return;
    toast.success("Order saved");
  }

  function handleSaveAndPrint() {
    if (!orderId) return;
    startTransition(async () => {
      try {
        await markOrderPrinted(orderId);
        openPrintWindow("bill");
        toast.success("Bill printed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to print");
      }
    });
  }

  function handleSaveAndEBill() {
    if (!orderId) return;
    toast.success("EBill queued — SMS/email integration coming soon");
  }

  function handleReset() {
    if (!orderId) return;
    if (!confirm("Reset this order? All items and the order itself will be discarded.")) return;
    startTransition(async () => {
      try {
        await cancelOrder(orderId);
        clearSelection();
        toast.success("Order reset");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to reset");
      }
    });
  }

  function handleSendKOTAndPrint() {
    if (!orderId || unsentItems.length === 0) return;
    const itemIds = unsentItems.map((i) => i.id);
    startTransition(async () => {
      try {
        await createKOT(orderId, itemIds);
        openPrintWindow("kot");
        toast.success(`KOT sent and printed (${itemIds.length} item${itemIds.length === 1 ? "" : "s"})`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed");
      }
    });
  }

  function handlePayWith(mode: PaymentMode) {
    if (!orderId || totalAmount <= 0) return;
    const remaining = totalAmount - totalPaid;
    if (remaining <= 0) {
      toast.info("Already settled");
      return;
    }
    startTransition(async () => {
      try {
        await createPayment({ orderId, mode, amount: remaining });
        clearSelection();
        toast.success(`${mode} payment recorded — ${formatCurrency(remaining)}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Payment failed");
      }
    });
  }

  function handlePayDue() {
    if (!orderId) return;
    toast.success("Order marked as due — settle later");
  }

  const orderTypeLabel =
    orderType === "DINE_IN" ? "Dine In" : orderType === "TAKEAWAY" ? "Pick Up" : "Delivery";

  // Cart panel — split into four reusable JSX sections so the docked column
  // (≥2xl) and Sheet (menuOpen <2xl) can stack them vertically, while the
  // laptop takeover (<2xl, !menuOpen) lays out items + footer side by side.
  const cartHeaderEl = activeOrder ? (
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

        {/* Persons + Assign-to */}
        <div className="mt-3 pt-3 border-t border-outline-variant/20 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[10px] font-black text-secondary uppercase tracking-wider mb-1">
              Persons
            </span>
            <input
              type="number"
              min={0}
              max={99}
              value={personsDraft}
              onChange={(e) => setPersonsDraft(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={handleSavePersons}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder="—"
              disabled={isPending}
              className="w-full h-8 px-2 rounded-md bg-surface-container-lowest text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-black text-secondary uppercase tracking-wider mb-1">
              Assign To
            </span>
            <select
              value={assignedToDraft}
              onChange={(e) => handleSaveAssignee(e.target.value)}
              disabled={isPending}
              className="w-full h-8 px-2 rounded-md bg-surface-container-lowest text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.role}
                </option>
              ))}
            </select>
          </label>
        </div>
    </div>
  ) : null;

  const cartSearchEl = activeOrder ? (
    <div className="px-6 pt-4 pb-3 border-b border-outline-variant/20 relative">
        <div className="flex items-center gap-2 bg-surface-container-lowest rounded-xl px-3 py-2 shadow-sm">
          <span className="material-symbols-outlined text-secondary text-lg">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
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
              searchResults.map((item, idx) => (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el && idx === searchHighlight) {
                      el.scrollIntoView({ block: "nearest" });
                    }
                  }}
                  onMouseEnter={() => setSearchHighlight(idx)}
                  className={`px-3 py-2 cursor-pointer border-b border-outline-variant/10 last:border-b-0 ${
                    idx === searchHighlight ? "bg-primary/10" : "hover:bg-surface-container-low"
                  }`}
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
  ) : null;

  const cartItemsInner = activeOrder ? (
    <>
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
                  <QuantityInput
                    value={item.quantity}
                    disabled={isPending}
                    onCommit={(next) => handleUpdateQty(item.id, next)}
                  />
                  <button
                    onClick={() => handleUpdateQty(item.id, 0)}
                    disabled={isPending}
                    className="h-6 w-6 rounded-md bg-surface-container-highest text-secondary flex items-center justify-center hover:bg-error/10 hover:text-error transition-colors disabled:opacity-50"
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
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
    </>
  ) : null;

  const cartFooterInner = activeOrder ? (
    <>
        {/* Order-Wise Comments */}
        <div>
          <span className="block text-[10px] font-black text-secondary uppercase tracking-wider mb-1">
            Order-Wise Comments
          </span>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Notes for this order (e.g. less spicy, no onion)"
            rows={2}
            disabled={isPending}
            className="w-full px-2 py-1.5 rounded-md bg-surface-container-lowest text-xs text-on-surface placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none"
          />
        </div>

        {/* Totals */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-secondary">Total Qty</span>
            <span className="font-semibold text-on-surface">{totalQty}</span>
          </div>
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
              <span className="text-secondary">
                Discount{activeOrder.complimentary ? " (Complimentary)" : ""}
              </span>
              <span className="font-semibold text-tertiary">-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs">
            <span className="text-secondary">Round Off</span>
            <input
              type="text"
              inputMode="decimal"
              value={roundOffDraft}
              onChange={(e) => setRoundOffDraft(e.target.value.replace(/[^0-9.\-]/g, ""))}
              onBlur={handleSaveRoundOff}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  const ro = Number(activeOrder.roundOff ?? 0);
                  setRoundOffDraft(ro === 0 ? "" : String(ro));
                  e.currentTarget.blur();
                }
              }}
              placeholder="0"
              disabled={isPending}
              className="h-6 w-16 px-1.5 rounded-md bg-surface-container-lowest text-xs font-semibold text-on-surface text-right focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <div className="border-t border-outline-variant/20 pt-2 flex justify-between items-center">
            <span className="text-sm font-bold text-on-surface">Total</span>
            <span className="font-headline text-2xl font-black text-on-surface">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Customer Paid + Return + Complimentary */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <label className="block">
            <span className="block text-[10px] font-black text-secondary uppercase tracking-wider mb-1">
              Customer Paid
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={customerPaidDraft}
              onChange={(e) => setCustomerPaidDraft(e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={handleSaveCustomerPaid}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder="0.00"
              disabled={isPending}
              className="w-full h-8 px-2 rounded-md bg-surface-container-lowest text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </label>
          <div>
            <span className="block text-[10px] font-black text-secondary uppercase tracking-wider mb-1">
              Return to Customer
            </span>
            <div className="w-full h-8 px-2 rounded-md bg-surface-container-lowest text-sm font-bold text-on-surface flex items-center">
              {formatCurrency(returnToCustomer)}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activeOrder.complimentary ?? false}
            onChange={handleToggleComplimentary}
            disabled={isPending}
            className="h-4 w-4 rounded border-outline-variant/50 accent-primary disabled:opacity-50"
          />
          <span className="text-on-surface">Complimentary</span>
          <span className="text-secondary text-[10px] font-medium">
            (zeroes the bill total)
          </span>
        </label>

        {/* Action button row */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex flex-col items-center gap-0.5 bg-surface-container-highest text-on-surface text-[10px] font-bold py-2 rounded-md hover:bg-surface-dim transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">save</span>
            Save
          </button>
          <button
            onClick={handleSaveAndPrint}
            disabled={isPending}
            className="flex flex-col items-center gap-0.5 bg-surface-container-highest text-on-surface text-[10px] font-bold py-2 rounded-md hover:bg-surface-dim transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Save & Print
          </button>
          <button
            onClick={handleSaveAndEBill}
            disabled={isPending}
            className="flex flex-col items-center gap-0.5 bg-surface-container-highest text-on-surface text-[10px] font-bold py-2 rounded-md hover:bg-surface-dim transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">email</span>
            Save & EBill
          </button>
          <button
            onClick={handleReset}
            disabled={isPending}
            className="flex flex-col items-center gap-0.5 bg-surface-container-highest text-error text-[10px] font-bold py-2 rounded-md hover:bg-error/10 transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
            Reset
          </button>
          <button
            onClick={handleSendKOT}
            disabled={isPending || unsentItems.length === 0}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold py-2 rounded-md transition-all disabled:opacity-40 ${
              unsentItems.length > 0
                ? "primary-gradient text-white shadow"
                : "bg-surface-container-highest text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">send</span>
            KOT{unsentItems.length > 0 ? ` (${unsentItems.length})` : ""}
          </button>
          <button
            onClick={handleSendKOTAndPrint}
            disabled={isPending || unsentItems.length === 0}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold py-2 rounded-md transition-all disabled:opacity-40 ${
              unsentItems.length > 0
                ? "bg-tertiary text-on-primary shadow"
                : "bg-surface-container-highest text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-base">local_printshop</span>
            KOT & Print
          </button>
        </div>

        {/* Payment chips */}
        <div className="flex gap-1.5 pt-1">
          <PayChip
            label="Cash"
            icon="payments"
            disabled={isPending || totalAmount <= 0}
            onClick={() => handlePayWith("CASH")}
          />
          <PayChip
            label="Card"
            icon="credit_card"
            disabled={isPending || totalAmount <= 0}
            onClick={() => handlePayWith("CARD")}
          />
          <PayChip
            label="Due"
            icon="schedule"
            disabled={isPending}
            onClick={handlePayDue}
          />
          <PayChip
            label="Other"
            icon="more_horiz"
            disabled={isPending || totalAmount <= 0}
            onClick={() => setOtherPaymentOpen(true)}
          />
          <PayChip
            label="More"
            icon="apps"
            disabled={isPending}
            onClick={() => toast.info("Integrations coming soon")}
          />
        </div>
    </>
  ) : null;

  const emptyCartEl = (
    <div className="flex-1 flex items-center justify-center text-center p-8">
      <div>
        <span className="material-symbols-outlined text-5xl text-stone-300">point_of_sale</span>
        <p className="font-headline font-bold text-on-surface mt-4">
          {orderType === "DINE_IN" ? "No Table Selected" : `No ${orderTypeLabel} Order Selected`}
        </p>
        <p className="text-sm text-secondary mt-1">
          {orderType === "DINE_IN"
            ? "Select an occupied table to view its order, or tap an available table to seat guests."
            : `Click "New ${orderTypeLabel} Order" to start billing, or select an existing order from the queue.`}
        </p>
      </div>
    </div>
  );

  // Stacked layout: header → search → items → footer. Used in the docked
  // ≥2xl column and the menu-open Sheet slide-over.
  const cartContent = activeOrder ? (
    <>
      {cartHeaderEl}
      {cartSearchEl}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">{cartItemsInner}</div>
      <div className="border-t border-outline-variant/20 p-6 space-y-3">{cartFooterInner}</div>
    </>
  ) : (
    emptyCartEl
  );

  // Split layout for the laptop takeover (<2xl, !menuOpen): items column on
  // the left (header + search + scrolling items), bill summary + actions on
  // the right. Keeps controls in reach and uses horizontal space properly.
  const cartSplitContent = activeOrder ? (
    <div className="flex-1 min-h-0 flex min-w-0">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {cartHeaderEl}
        {cartSearchEl}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">{cartItemsInner}</div>
      </div>
      <div className="w-[380px] flex-shrink-0 overflow-y-auto border-l border-outline-variant/20 bg-surface-container-low">
        <div className="p-6 space-y-3">{cartFooterInner}</div>
      </div>
    </div>
  ) : null;

  const quickPanel = (
    <QuickSearchPanel
      quickSearch={quickSearch}
      onQuickSearch={setQuickSearch}
      queueTab={queueTab}
      onQueueTab={setQueueTab}
      orders={activeOrdersQueue}
      activeOrderId={activeOrder?.id ?? null}
      onSelect={handleSelectFromQueue}
    />
  );

  return (
    <div className="flex gap-0 -m-8 h-[calc(100vh-4rem)]">
      {/* LEFT MINI-PANEL — quick-search + active-order queue (xl+ only).
          When the cart takeover is active below 2xl, this hides so the cart
          can use the full width. */}
      <div
        className={`${
          cartTakeoverActive ? "hidden 2xl:flex" : "hidden xl:flex"
        } w-60 bg-surface-container-low border-r border-outline-variant/30 flex-col`}
      >
        {quickPanel}
      </div>

      {/* CART TAKEOVER (below 2xl, only when an order is selected and the
          menu picker is closed). At 2xl+ the docked cart on the right handles
          this — takeover stays hidden. */}
      {cartTakeoverActive && (
        <div className="flex-1 2xl:hidden flex flex-col bg-surface-container min-w-0">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-outline-variant/30 bg-surface-container-lowest shadow-sm">
            <button
              type="button"
              onClick={clearSelection}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-bold bg-surface-container-high text-on-surface hover:bg-surface-dim transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to floor
            </button>
            <button
              type="button"
              onClick={() => setActiveOrdersSheetOpen(true)}
              className="ml-auto flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-bold border border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-base">list_alt</span>
              Active Orders ({activeOrdersQueue.length})
            </button>
          </div>
          {cartSplitContent}
        </div>
      )}

      {/* CENTER — Floor Map / Order Queue / Menu Selector.
          Hidden below 2xl while the cart takeover is active. */}
      <div
        className={`${
          cartTakeoverActive ? "hidden 2xl:block" : "block"
        } flex-1 overflow-y-auto p-8 min-w-0`}
      >
        {/* Order Type Radio + laptop Active Orders trigger */}
        <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
          <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-xl shadow-sm w-fit">
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
          <button
            type="button"
            onClick={() => setActiveOrdersSheetOpen(true)}
            className="xl:hidden flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 text-xs font-bold text-on-surface shadow-sm hover:border-primary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">list_alt</span>
            Active Orders ({activeOrdersQueue.length})
          </button>
        </div>

        {!menuOpen ? (
          <>
            {orderType === "DINE_IN" ? (
              <DineInGrid
                tables={tables}
                selectedTableId={selectedTableId}
                isPending={isPending}
                moveKOTMode={moveKOTMode}
                moveSourceOrderId={moveSourceOrderId}
                onToggleMoveKOT={toggleMoveKOTMode}
                onMoveKOTTableClick={handleMoveKOTTableClick}
                onSelectTable={(id) => {
                  setSelectedTableId(id);
                  openCartSheetIfLaptop();
                }}
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
                onSelect={(id) => {
                  setSelectedOrderId(id);
                  openCartSheetIfLaptop();
                }}
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

      {/* RIGHT — Cart panel (docked column, desktop ≥1536px only) */}
      <div className="hidden 2xl:flex w-[440px] bg-surface-container border-l border-outline-variant/30 shadow-[-4px_0_24px_rgba(0,0,0,0.06)] flex-col">
        {cartContent}
      </div>

      {/* Floating cart button + slide-over — only when the menu picker is open
          below 2xl. When !menuOpen the cart takeover already fills the main
          area, so the floating button would be redundant. */}
      <div className="2xl:hidden">
        {activeOrder && menuOpen && (
          <button
            type="button"
            onClick={() => setCartSheetOpen(true)}
            className="fixed bottom-6 right-6 z-40 primary-gradient text-on-primary rounded-full shadow-xl px-5 h-14 flex items-center gap-2 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            <span className="font-bold text-sm">
              Cart ({activeOrder.orderItems.length})
            </span>
            <span className="font-black text-sm">· {formatCurrency(totalAmount)}</span>
          </button>
        )}
        <Sheet
          open={cartSheetOpen && Boolean(activeOrder) && menuOpen}
          onOpenChange={setCartSheetOpen}
        >
          <SheetContent
            side="right"
            className="w-[92vw] sm:!max-w-[480px] !p-0 bg-surface-container flex flex-col"
          >
            <SheetTitle className="sr-only">Current Active Order</SheetTitle>
            {cartContent}
          </SheetContent>
        </Sheet>
      </div>

      {orderType !== "DINE_IN" && (
        <CustomerDetailsDialog
          open={customerDialogOpen}
          orderType={orderType}
          onOpenChange={setCustomerDialogOpen}
          onCreated={(id) => {
            setSelectedOrderId(id);
            openCartSheetIfLaptop();
          }}
        />
      )}

      {/* Laptop fallback: Active Orders slide-over */}
      <Sheet open={activeOrdersSheetOpen} onOpenChange={setActiveOrdersSheetOpen}>
        <SheetContent
          side="left"
          className="w-[88vw] sm:!max-w-[320px] !p-0 bg-surface-container-low flex flex-col"
        >
          <SheetTitle className="sr-only">Active Orders</SheetTitle>
          {quickPanel}
        </SheetContent>
      </Sheet>

      {/* Online + sync indicator (bottom-left) */}
      <div className="fixed bottom-4 left-4 z-30 flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 rounded-full px-3 py-1.5 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">
          Online
        </span>
        <span className="text-[10px] text-secondary">All orders synced</span>
      </div>

      {/* "Other" payment dialog — pick UPI / Wallet / Split */}
      <Dialog open={otherPaymentOpen} onOpenChange={setOtherPaymentOpen}>
        <DialogContent className="sm:!max-w-sm">
          <DialogHeader>
            <DialogTitle>Other Payment Methods</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(["UPI", "WALLET", "SPLIT"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setOtherPaymentOpen(false);
                  handlePayWith(mode);
                }}
                disabled={isPending}
                className="flex flex-col items-center gap-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg py-3 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-2xl text-primary">
                  {mode === "UPI" ? "qr_code_2" : mode === "WALLET" ? "account_balance_wallet" : "call_split"}
                </span>
                <span className="text-xs font-bold">{mode}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────────────────────── sub-components ──────────────────────────

function DineInGrid({
  tables,
  selectedTableId,
  isPending,
  moveKOTMode,
  moveSourceOrderId,
  onToggleMoveKOT,
  onMoveKOTTableClick,
  onSelectTable,
  onSeat,
  onOpenMenu,
}: {
  tables: TableWithOrders[];
  selectedTableId: string | null;
  isPending: boolean;
  moveKOTMode: boolean;
  moveSourceOrderId: string | null;
  onToggleMoveKOT: () => void;
  onMoveKOTTableClick: (table: TableWithOrders, isOccupied: boolean) => void;
  onSelectTable: (id: string) => void;
  onSeat: (id: string) => void;
  onOpenMenu: (id: string) => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            Main Dining Hall
          </h1>
          <p className="text-secondary mt-1 text-sm font-medium">
            {tables.filter((t) => t.status === "OCCUPIED").length}/{tables.length} Tables Occupied
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onToggleMoveKOT}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-bold transition-all ${
              moveKOTMode
                ? "bg-primary text-on-primary shadow"
                : "bg-surface-container-lowest border border-outline-variant/30 text-on-surface hover:border-primary hover:text-primary"
            }`}
            aria-pressed={moveKOTMode}
          >
            <span className="material-symbols-outlined text-base">swap_horiz</span>
            Move KOT/Items
          </button>
          <button
            type="button"
            onClick={() => toast.info("Contactless ordering coming soon")}
            className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-bold bg-surface-container-lowest border border-outline-variant/30 text-on-surface hover:border-primary hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-base">qr_code_scanner</span>
            + Contactless
          </button>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 px-1">
        <LegendDot color="tertiary" label="Blank" />
        <LegendDot color="primary" label="Running" />
        <LegendDot color="emerald" label="Printed" />
        <LegendDot color="amber" label="Paid" />
        <LegendDot color="violet" label="Running KOT" />
      </div>

      {moveKOTMode && (
        <div className="mb-4 px-4 py-2.5 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-2 text-xs font-semibold text-on-surface">
          <span className="material-symbols-outlined text-base text-primary">info</span>
          {moveSourceOrderId
            ? "Pick an empty table to move the order to."
            : "Pick an occupied table to move from."}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
        {tables.map((table) => {
          const order = table.orders[0];
          const isOccupied = table.status === "OCCUPIED" && order;
          const isSelected = table.id === selectedTableId;
          const isMoveSource = order && order.id === moveSourceOrderId;
          const isPrinted = order?.printedAt != null;
          const isKOTHere = order?.orderItems?.some((i) => !!i.kotId);
          const tint = !isOccupied
            ? "border-tertiary"
            : isPrinted && isKOTHere
              ? "border-violet-500"
              : isPrinted
                ? "border-emerald-500"
                : "border-primary";

          return (
            <div
              key={table.id}
              onClick={() => {
                if (moveKOTMode) {
                  onMoveKOTTableClick(table, Boolean(isOccupied));
                  return;
                }
                if (isOccupied) onSelectTable(table.id);
              }}
              className={`bg-surface-container-lowest p-4 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-all cursor-pointer ${tint} ${
                isSelected ? "ring-2 ring-primary/30" : ""
              } ${isMoveSource ? "ring-2 ring-amber-400" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-headline text-xl font-extrabold text-on-surface">{table.name}</h3>
                <span
                  className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    isOccupied ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                  }`}
                >
                  {isOccupied ? `PAX ${table.capacity}` : `${table.capacity} Seats`}
                </span>
              </div>

              {isOccupied ? (
                <>
                  <p className="text-[11px] text-secondary truncate">Server: {order.createdBy.name}</p>
                  <p className="text-[11px] text-secondary mb-2 truncate">
                    {order.orderNumber} · {order.orderItems.length} items
                  </p>
                  <p className="text-lg font-black font-headline text-on-surface mb-3">
                    {formatCurrency(order.totalAmount.toString())}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMenu(table.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 bg-surface-container-highest text-on-surface text-[11px] font-bold py-1.5 rounded-lg hover:bg-surface-dim transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      Add
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTable(table.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 bg-primary text-on-primary text-[11px] font-bold py-1.5 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-sm">receipt_long</span>
                      Bill
                    </button>
                  </div>
                </>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeat(table.id);
                  }}
                  className="flex-1 flex items-center justify-center border-2 border-dashed border-outline-variant/40 rounded-lg py-5 mt-1 hover:border-tertiary/60 hover:bg-tertiary/5 transition-all group"
                >
                  <div className="text-center">
                    <span className="material-symbols-outlined text-2xl text-outline-variant group-hover:text-tertiary transition-colors">
                      touch_app
                    </span>
                    <p className="text-[11px] font-bold text-secondary mt-0.5 group-hover:text-tertiary transition-colors">
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

function LegendDot({
  color,
  label,
}: {
  color: "tertiary" | "primary" | "emerald" | "amber" | "violet";
  label: string;
}) {
  const bg = {
    tertiary: "bg-tertiary",
    primary: "bg-primary",
    emerald: "bg-emerald-500",
    amber: "bg-amber-400",
    violet: "bg-violet-500",
  }[color];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${bg}`} />
      <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

type QueueEntry = {
  id: string;
  orderNumber: string;
  label: string;
  subLabel: string;
  totalAmount: number;
  tableId: string | null;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  customerPhone?: string;
};

function QuickSearchPanel({
  quickSearch,
  onQuickSearch,
  queueTab,
  onQueueTab,
  orders,
  activeOrderId,
  onSelect,
}: {
  quickSearch: string;
  onQuickSearch: (v: string) => void;
  queueTab: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "KOT";
  onQueueTab: (v: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "KOT") => void;
  orders: QueueEntry[];
  activeOrderId: string | null;
  onSelect: (entry: QueueEntry) => void;
}) {
  return (
    <>
      <div className="p-4 border-b border-outline-variant/20">
        <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-2">
          Quick Search
        </p>
        <div className="flex items-center gap-2 bg-surface-container-lowest rounded-lg px-2.5 py-1.5">
          <span className="material-symbols-outlined text-secondary text-base">search</span>
          <input
            value={quickSearch}
            onChange={(e) => onQuickSearch(e.target.value)}
            placeholder="Table / Bill / Phone"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-stone-400 min-w-0"
            autoComplete="off"
          />
          {quickSearch && (
            <button
              type="button"
              onClick={() => onQuickSearch("")}
              className="text-secondary hover:text-on-surface shrink-0"
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-2 pt-2 grid grid-cols-4 gap-1 border-b border-outline-variant/20 pb-2">
        {(
          [
            { key: "DINE_IN", label: "Dine In", icon: "restaurant" },
            { key: "TAKEAWAY", label: "Pick Up", icon: "takeout_dining" },
            { key: "DELIVERY", label: "Delivery", icon: "delivery_dining" },
            { key: "KOT", label: "KOT", icon: "soup_kitchen" },
          ] as const
        ).map((t) => {
          const active = queueTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onQueueTab(t.key)}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                active
                  ? "bg-primary text-on-primary shadow"
                  : "text-secondary hover:text-on-surface hover:bg-surface-container"
              }`}
              aria-pressed={active}
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {orders.length === 0 ? (
          <p className="text-center text-[11px] text-secondary italic py-6">
            No active orders
          </p>
        ) : (
          orders.map((o) => {
            const selected = o.id === activeOrderId;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onSelect(o)}
                className={`w-full text-left rounded-lg border p-2.5 transition-all ${
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-on-surface truncate">{o.label}</span>
                  <span className="text-[10px] font-black text-on-surface shrink-0">
                    {formatCurrency(o.totalAmount)}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-secondary truncate">{o.orderNumber}</p>
                <p className="text-[10px] text-secondary truncate">{o.subLabel}</p>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}

function PayChip({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 flex flex-col items-center gap-0.5 bg-surface-container-lowest border border-outline-variant/30 text-secondary text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-lg hover:border-primary hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      {label}
    </button>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function QuantityInput({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      setDraft(String(value));
      return;
    }
    const n = parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n < 1) {
      setDraft(String(value));
      return;
    }
    if (n === value) {
      setDraft(String(value));
      return;
    }
    onCommit(n);
  };

  return (
    <input
      type="number"
      min={1}
      step={1}
      inputMode="numeric"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
      onFocus={(e) => e.currentTarget.select()}
      className="h-7 w-14 rounded-md bg-surface-container-highest text-sm font-black text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}
