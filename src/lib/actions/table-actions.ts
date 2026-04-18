"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";
import {
  tableSchema,
  tablePositionsBatchSchema,
  type TableFormData,
  type TablePositionData,
} from "@/lib/validators/table";
import { serialize } from "@/lib/utils";

export async function getTables() {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: [{ floor: "asc" }, { name: "asc" }],
  });
  return serialize(tables);
}

export async function getTablesWithActiveOrders() {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    include: {
      orders: {
        where: {
          status: {
            in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"],
          },
        },
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          orderItems: {
            include: {
              menuItem: true,
              variant: true,
              addOns: { include: { addOn: true } },
            },
          },
          createdBy: { select: { name: true } },
          payments: true,
        },
      },
    },
  });
  return serialize(tables);
}

export async function createTable(data: TableFormData) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const validated = tableSchema.parse(data);

  const table = await prisma.table.create({
    data: {
      ...validated,
      restaurantId,
    },
  });

  revalidatePath("/pos");
  revalidatePath("/settings/tables");
  return serialize(table);
}

export async function updateTable(id: string, data: TableFormData) {
  const validated = tableSchema.parse(data);

  const table = await prisma.table.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/pos");
  revalidatePath("/settings/tables");
  return serialize(table);
}

export async function deleteTable(id: string) {
  const activeOrders = await prisma.order.count({
    where: {
      tableId: id,
      status: {
        in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"],
      },
    },
  });

  if (activeOrders > 0) {
    throw new Error("Cannot delete table with active orders");
  }

  await prisma.table.delete({ where: { id } });
  revalidatePath("/pos");
  revalidatePath("/settings/tables");
}

export async function updateTablePositions(positions: TablePositionData[]) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const validated = tablePositionsBatchSchema.parse(positions);
  if (validated.length === 0) return;

  const owned = await prisma.table.findMany({
    where: { restaurantId, id: { in: validated.map((p) => p.id) } },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((t) => t.id));

  await prisma.$transaction(
    validated
      .filter((p) => ownedIds.has(p.id))
      .map((p) =>
        prisma.table.update({
          where: { id: p.id },
          data: { positionX: p.positionX, positionY: p.positionY },
        })
      )
  );

  revalidatePath("/pos");
  revalidatePath("/settings/tables");
}
