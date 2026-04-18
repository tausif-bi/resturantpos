"use server";

import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";
import { serialize } from "@/lib/utils";

export async function getDashboardStats() {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [salesData, orderCount, activeTables, totalTables, topItem] =
    await Promise.all([
      // Today's completed orders total
      prisma.order.aggregate({
        where: {
          restaurantId,
          status: "COMPLETED",
          completedAt: { gte: today },
        },
        _sum: { totalAmount: true },
      }),

      // Today's order count
      prisma.order.count({
        where: {
          restaurantId,
          createdAt: { gte: today },
          status: { not: "CANCELLED" },
        },
      }),

      // Active tables
      prisma.table.count({
        where: { restaurantId, status: "OCCUPIED" },
      }),

      // Total tables
      prisma.table.count({
        where: { restaurantId },
      }),

      // Top selling item today
      prisma.orderItem.groupBy({
        by: ["menuItemId"],
        where: {
          order: {
            restaurantId,
            status: "COMPLETED",
            completedAt: { gte: today },
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

export async function getCategoryMix() {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        restaurantId,
        status: "COMPLETED",
        completedAt: { gte: today },
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
