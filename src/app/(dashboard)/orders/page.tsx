import {
  listOrdersForOrdersPage,
  type OrdersListSort,
  type OrdersListTab,
  type OrdersListType,
} from "@/lib/actions/order-actions";
import { OrdersClient } from "./orders-client";

const TABS: OrdersListTab[] = ["current", "online", "advance"];
const TYPES: OrdersListType[] = ["all", "DINE_IN", "DELIVERY", "TAKEAWAY"];
const SORTS: OrdersListSort[] = [
  "latest",
  "oldest",
  "amount_desc",
  "amount_asc",
];

function pickEnum<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const v = Array.isArray(value) ? value[0] : value;
  return (allowed as readonly string[]).includes(v ?? "") ? (v as T) : fallback;
}

function pickString(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return v ?? "";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const tab = pickEnum(params.tab, TABS, "current");
  const type = pickEnum(params.type, TYPES, "all");
  const sort = pickEnum(params.sort, SORTS, "latest");
  const search = pickString(params.q).trim();
  const dateFrom = pickString(params.dateFrom);
  const dateTo = pickString(params.dateTo);

  const { orders } = await listOrdersForOrdersPage({
    tab,
    type,
    sort,
    search,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  return (
    <OrdersClient
      initialOrders={orders}
      filters={{ tab, type, sort, search, dateFrom, dateTo }}
    />
  );
}
