"use server";

import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";
import { serialize } from "@/lib/utils";

export async function getSalesReport(startDate: Date, endDate: Date) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      status: "COMPLETED",
      completedAt: { gte: startDate, lte: endDate },
    },
    select: {
      totalAmount: true,
      completedAt: true,
    },
    orderBy: { completedAt: "asc" },
  });

  // Group by day
  const dailyMap = new Map<string, { total: number; count: number }>();
  let totalSales = 0;

  for (const order of orders) {
    const day = order.completedAt!.toISOString().slice(0, 10);
    const amount = Number(order.totalAmount);
    totalSales += amount;

    const existing = dailyMap.get(day);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      dailyMap.set(day, { total: amount, count: 1 });
    }
  }

  const dailyData = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    total: Math.round(data.total * 100) / 100,
    orderCount: data.count,
  }));

  return serialize({
    dailyData,
    summary: {
      totalSales: Math.round(totalSales * 100) / 100,
      totalOrders: orders.length,
      avgOrderValue:
        orders.length > 0
          ? Math.round((totalSales / orders.length) * 100) / 100
          : 0,
    },
  });
}

export async function getTopSellingItems(startDate: Date, endDate: Date) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const items = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: {
      order: {
        restaurantId,
        status: "COMPLETED",
        completedAt: { gte: startDate, lte: endDate },
      },
    },
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });

  const results = await Promise.all(
    items.map(async (item) => {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
        include: { category: true },
      });
      return {
        itemName: menuItem?.name ?? "Unknown",
        categoryName: menuItem?.category.name ?? "Unknown",
        quantity: item._sum.quantity ?? 0,
        revenue: Math.round(Number(item._sum.totalPrice ?? 0) * 100) / 100,
      };
    })
  );

  return serialize(results);
}

export async function getStaffPerformance(startDate: Date, endDate: Date) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const staff = await prisma.order.groupBy({
    by: ["createdById"],
    where: {
      restaurantId,
      status: "COMPLETED",
      completedAt: { gte: startDate, lte: endDate },
    },
    _count: true,
    _sum: { totalAmount: true },
    orderBy: { _sum: { totalAmount: "desc" } },
  });

  const results = await Promise.all(
    staff.map(async (s) => {
      const user = await prisma.user.findUnique({
        where: { id: s.createdById },
        select: { name: true, role: true },
      });
      return {
        staffName: user?.name ?? "Unknown",
        role: user?.role ?? "WAITER",
        orderCount: s._count,
        totalRevenue: Math.round(Number(s._sum.totalAmount ?? 0) * 100) / 100,
      };
    })
  );

  return serialize(results);
}

export async function getCategoryBreakdown(startDate: Date, endDate: Date) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        restaurantId,
        status: "COMPLETED",
        completedAt: { gte: startDate, lte: endDate },
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

  return serialize(Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      revenue: Math.round(amount * 100) / 100,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue));
}
