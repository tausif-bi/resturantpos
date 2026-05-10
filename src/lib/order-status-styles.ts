import type { OrderStatus } from "@prisma/client";

export type OrderRowTint = "saved" | "printed" | "cancelled" | "paid";

export interface OrderTintInput {
  status: OrderStatus | string;
  printedAt: Date | string | null;
}

export function getOrderRowTint(order: OrderTintInput): OrderRowTint {
  if (order.status === "CANCELLED") return "cancelled";
  if (order.status === "COMPLETED") return "paid";
  if (order.printedAt) return "printed";
  return "saved";
}

export const ORDER_TINT_STYLES: Record<
  OrderRowTint,
  { row: string; chip: string; label: string }
> = {
  saved: {
    row: "bg-surface-container-lowest hover:bg-surface-container-low",
    chip: "bg-surface-container-low text-on-surface ring-1 ring-outline-variant/50",
    label: "Saved Bill",
  },
  printed: {
    row: "bg-emerald-50 hover:bg-emerald-100",
    chip: "bg-emerald-500 text-white",
    label: "Printed Bill",
  },
  cancelled: {
    row: "bg-orange-50 hover:bg-orange-100",
    chip: "bg-orange-500 text-white",
    label: "Cancelled Bill",
  },
  paid: {
    row: "bg-amber-50 hover:bg-amber-100",
    chip: "bg-amber-400 text-amber-950",
    label: "Paid",
  },
};
