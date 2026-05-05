"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";
import { serialize } from "@/lib/utils";
import { generateKOTNumber } from "@/lib/order-number";
import type { KOTStatus } from "@prisma/client";

export async function createKOT(orderId: string, orderItemIds: string[]) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  if (orderItemIds.length === 0) {
    throw new Error("No items to send to kitchen");
  }

  const kotNumber = await generateKOTNumber(restaurantId);

  const kot = await prisma.$transaction(async (tx) => {
    const newKOT = await tx.kOT.create({
      data: {
        kotNumber,
        restaurantId,
        orderId,
        status: "PENDING",
      },
    });

    // Link order items to this KOT
    await tx.orderItem.updateMany({
      where: { id: { in: orderItemIds } },
      data: { kotId: newKOT.id },
    });

    // Update order status to CONFIRMED if currently PENDING
    await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "CONFIRMED" },
    });

    return newKOT;
  });

  revalidatePath("/pos");
  revalidatePath("/kitchen");
  return serialize(kot);
}

export async function getActiveKOTs(stationFilter?: string) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const kots = await prisma.kOT.findMany({
    where: {
      restaurantId,
      status: { in: ["PENDING", "PREPARING"] },
    },
    include: {
      items: {
        include: {
          menuItem: {
            include: { category: true },
          },
          variant: true,
          addOns: { include: { addOn: true } },
        },
      },
      order: {
        include: {
          table: true,
          createdBy: { select: { name: true } },
          customer: { select: { name: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Filter by station (category name) if specified
  if (stationFilter && stationFilter !== "ALL") {
    return serialize(kots.filter((kot) =>
      kot.items.some(
        (item) =>
          item.menuItem.category.name.toLowerCase() ===
          stationFilter.toLowerCase()
      )
    ));
  }

  return serialize(kots);
}

export async function updateKOTStatus(kotId: string, status: KOTStatus) {
  const now = new Date();

  const kot = await prisma.kOT.update({
    where: { id: kotId },
    data: {
      status,
      ...(status === "PREPARING" ? { acceptedAt: now } : {}),
      ...(status === "READY" ? { readyAt: now } : {}),
    },
  });

  // If all KOTs for this order are READY, update order status
  if (status === "READY") {
    const pendingKOTs = await prisma.kOT.count({
      where: {
        orderId: kot.orderId,
        status: { in: ["PENDING", "PREPARING"] },
      },
    });

    if (pendingKOTs === 0) {
      await prisma.order.update({
        where: { id: kot.orderId },
        data: { status: "READY" },
      });
    }
  } else if (status === "PREPARING") {
    await prisma.order.updateMany({
      where: {
        id: kot.orderId,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      data: { status: "PREPARING" },
    });
  }

  revalidatePath("/kitchen");
  revalidatePath("/pos");
  return serialize(kot);
}

export async function getRecentReadyKOTs(sinceMinutes: number = 240) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const cutoff = new Date(Date.now() - sinceMinutes * 60_000);

  const kots = await prisma.kOT.findMany({
    where: {
      restaurantId,
      status: "READY",
      readyAt: { gte: cutoff },
    },
    include: {
      items: {
        include: {
          menuItem: {
            include: { category: true },
          },
          variant: true,
          addOns: { include: { addOn: true } },
        },
      },
      order: {
        include: {
          table: true,
          createdBy: { select: { name: true } },
          customer: { select: { name: true, phone: true } },
        },
      },
    },
    orderBy: { readyAt: "desc" },
  });

  return serialize(kots);
}

export async function recallKOT(kotId: string) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const existing = await prisma.kOT.findUnique({
    where: { id: kotId },
    select: { restaurantId: true, orderId: true, status: true },
  });
  if (!existing || existing.restaurantId !== restaurantId) {
    throw new Error("KOT not found");
  }
  if (existing.status !== "READY") {
    throw new Error("Only ready KOTs can be recalled");
  }

  const kot = await prisma.kOT.update({
    where: { id: kotId },
    data: { status: "PREPARING", readyAt: null },
  });

  // If the parent order was marked READY because all KOTs were ready,
  // bump it back to PREPARING.
  await prisma.order.updateMany({
    where: { id: existing.orderId, status: { in: ["READY", "SERVED"] } },
    data: { status: "PREPARING" },
  });

  revalidatePath("/kitchen");
  revalidatePath("/pos");
  return serialize(kot);
}

export async function setOrderItemPrepared(itemId: string, prepared: boolean) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    select: { order: { select: { restaurantId: true } } },
  });
  if (!item || item.order.restaurantId !== restaurantId) {
    throw new Error("Item not found");
  }

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: { preparedAt: prepared ? new Date() : null },
  });

  revalidatePath("/kitchen");
  return serialize(updated);
}
