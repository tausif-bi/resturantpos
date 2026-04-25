"use server";

import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";
import { serialize } from "@/lib/utils";
import type { DateRange } from "@/lib/date-range";

function defaultRange(): { from: Date; to: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { from: start, to: end };
}

export async function getDashboardStats(range?: DateRange) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const r = range ?? defaultRange();

  const [salesData, orderCount, activeTables, totalTables, topItem] =
    await Promise.all([
      prisma.order.aggregate({
        where: {
          restaurantId,
          status: "COMPLETED",
          completedAt: { gte: r.from, lte: r.to },
        },
        _sum: { totalAmount: true },
      }),

      prisma.order.count({
        where: {
          restaurantId,
          createdAt: { gte: r.from, lte: r.to },
          status: { not: "CANCELLED" },
        },
      }),

      prisma.table.count({
        where: { restaurantId, status: "OCCUPIED" },
      }),

      prisma.table.count({
        where: { restaurantId },
      }),

      prisma.orderItem.groupBy({
        by: ["menuItemId"],
        where: {
          order: {
            restaurantId,
            status: "COMPLETED",
            completedAt: { gte: r.from, lte: r.to },
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 1,
      }),
    ]);

  let topItemName = null;
  let topItemQty = 0;
  if (topItem.length > 0) {
    const item = await prisma.menuItem.findUnique({
      where: { id: topItem[0].menuItemId },
      select: { name: true },
    });
    topItemName = item?.name ?? null;
    topItemQty = topItem[0]._sum.quantity ?? 0;
  }

  return {
    totalSales: Number(salesData._sum.totalAmount ?? 0),
    orderCount,
    activeTables,
    totalTables,
    topItemName,
    topItemQty,
  };
}

export async function getCategoryMix(range?: DateRange) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const r = range ?? defaultRange();

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        restaurantId,
        status: "COMPLETED",
        completedAt: { gte: r.from, lte: r.to },
      },
    },
    include: {
      menuItem: { include: { category: true } },
    },
  });

  const categoryMap = new Map<string, number>();
  let total = 0;

  for (const item of items) {
    const catName = item.menuItem.category.name;
    const amount = Number(item.totalPrice);
    categoryMap.set(catName, (categoryMap.get(catName) ?? 0) + amount);
    total += amount;
  }

  return serialize(Array.from(categoryMap.entries()).map(([category, amount]) => ({
    category,
    amount: Math.round(amount * 100) / 100,
    percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
  })));
}
