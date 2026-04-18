"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";
import { serialize } from "@/lib/utils";
import { generateOrderNumber } from "@/lib/order-number";
import { calculateItemTax } from "@/lib/tax";
import {
  createOrderSchema,
  addItemSchema,
  discountSchema,
  type CreateOrderFormData,
  type AddItemFormData,
  type DiscountFormData,
} from "@/lib/validators/order";

export async function createOrder(data: CreateOrderFormData) {
  const { restaurantId, userId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const validated = createOrderSchema.parse(data);
  const orderNumber = await generateOrderNumber(restaurantId);

  const order = await prisma.$transaction(async (tx) => {
    if (validated.tableId) {
      const table = await tx.table.findUnique({ where: { id: validated.tableId } });
      if (!table) throw new Error("Table not found");
      if (table.status === "OCCUPIED") throw new Error("Table is already occupied");
    }

    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        restaurantId,
        tableId: validated.tableId ?? null,
        customerId: validated.customerId,
        createdById: userId,
        type: validated.type as "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE",
        status: "PENDING",
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
      },
    });

    if (validated.tableId) {
      await tx.table.update({
        where: { id: validated.tableId },
        data: { status: "OCCUPIED" },
      });
    }

    return newOrder;
  });

  revalidatePath("/pos");
  return serialize(order);
}

export async function getActiveNonDineOrders() {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      tableId: null,
      status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"] },
    },
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
      customer: { select: { name: true, phone: true, address: true, locality: true } },
      payments: true,
    },
  });
  return serialize(orders);
}

export async function getOrderWithItems(orderId: string) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const result = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: {
      orderItems: {
        include: {
          menuItem: { include: { taxes: { include: { taxConfig: true } } } },
          variant: true,
          addOns: { include: { addOn: true } },
          kot: true,
        },
        orderBy: { createdAt: "asc" },
      },
      table: true,
      payments: true,
      taxBreakdown: true,
      createdBy: { select: { name: true } },
    },
  });
  return serialize(result);
}

export async function addItemToOrder(data: AddItemFormData) {
  const validated = addItemSchema.parse(data);

  // Get menu item with price info
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: validated.menuItemId },
    include: {
      variants: true,
      addOns: true,
    },
  });
  if (!menuItem) throw new Error("Menu item not found");

  // Determine unit price
  let unitPrice = Number(menuItem.basePrice);
  if (validated.variantId) {
    const variant = menuItem.variants.find((v) => v.id === validated.variantId);
    if (variant) unitPrice = Number(variant.price);
  }

  // Add addon prices
  let addOnTotal = 0;
  if (validated.addOnIds.length > 0) {
    for (const addOnId of validated.addOnIds) {
      const addOn = menuItem.addOns.find((a) => a.id === addOnId);
      if (addOn) addOnTotal += Number(addOn.price);
    }
  }

  const totalUnitPrice = unitPrice + addOnTotal;
  const totalPrice = totalUnitPrice * validated.quantity;

  const orderItem = await prisma.orderItem.create({
    data: {
      orderId: validated.orderId,
      menuItemId: validated.menuItemId,
      variantId: validated.variantId,
      quantity: validated.quantity,
      unitPrice: totalUnitPrice,
      totalPrice,
      notes: validated.notes,
      addOns: {
        create: validated.addOnIds.map((addOnId) => {
          const addOn = menuItem.addOns.find((a) => a.id === addOnId);
          return {
            addOnId,
            price: addOn ? Number(addOn.price) : 0,
          };
        }),
      },
    },
  });

  await recalculateOrderTotals(validated.orderId);
  revalidatePath("/pos");
  return serialize(orderItem);
}

export async function updateOrderItemQuantity(
  orderItemId: string,
  quantity: number
) {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
  });
  if (!orderItem) throw new Error("Order item not found");

  if (quantity <= 0) {
    await prisma.orderItem.delete({ where: { id: orderItemId } });
  } else {
    await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        quantity,
        totalPrice: Number(orderItem.unitPrice) * quantity,
      },
    });
  }

  await recalculateOrderTotals(orderItem.orderId);
  revalidatePath("/pos");
}

export async function removeOrderItem(orderItemId: string) {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
  });
  if (!orderItem) throw new Error("Order item not found");

  await prisma.orderItem.delete({ where: { id: orderItemId } });
  await recalculateOrderTotals(orderItem.orderId);
  revalidatePath("/pos");
}

export async function applyDiscount(data: DiscountFormData) {
  const validated = discountSchema.parse(data);

  await prisma.order.update({
    where: { id: validated.orderId },
    data: {
      discountAmount: validated.discountAmount,
      discountReason: validated.discountReason,
    },
  });

  await recalculateOrderTotals(validated.orderId);
  revalidatePath("/pos");
}

export async function completeOrder(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) throw new Error("Order not found");

    await tx.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    if (order.tableId) {
      await tx.table.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE" },
      });
    }

    if (order.customerId) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: Number(order.totalAmount) },
        },
      });
    }
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard");
  revalidatePath("/kitchen");
}

export async function cancelOrder(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");

    await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    if (order.tableId) {
      await tx.table.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE" },
      });
    }
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard");
}

export async function getActiveOrders() {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const result = await prisma.order.findMany({
    where: {
      restaurantId,
      status: {
        in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"],
      },
    },
    include: {
      orderItems: { include: { menuItem: true } },
      table: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return serialize(result);
}

// Private helper — recalculate order totals from all items
async function recalculateOrderTotals(orderId: string) {
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId },
    include: {
      menuItem: {
        include: { taxes: { include: { taxConfig: true } } },
      },
    },
  });

  let subtotal = 0;
  const taxMap = new Map<
    string,
    { taxName: string; taxPercent: number; taxAmount: number }
  >();

  for (const item of orderItems) {
    subtotal += Number(item.totalPrice);

    const taxes = item.menuItem.taxes.map((t) => ({
      name: t.taxConfig.name,
      percentage: Number(t.taxConfig.percentage),
      isInclusive: t.taxConfig.isInclusive,
    }));

    const { taxBreakdown } = calculateItemTax(
      Number(item.unitPrice),
      item.quantity,
      taxes
    );

    for (const tb of taxBreakdown) {
      const key = `${tb.taxName}-${tb.taxPercent}`;
      const existing = taxMap.get(key);
      if (existing) {
        existing.taxAmount += tb.taxAmount;
      } else {
        taxMap.set(key, { ...tb });
      }
    }
  }

  const taxBreakdown = Array.from(taxMap.values());
  const taxAmount = taxBreakdown.reduce((sum, t) => sum + t.taxAmount, 0);

  // Get current discount
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { discountAmount: true, roundOff: true },
  });

  const discount = Number(order?.discountAmount ?? 0);
  const roundOff = Number(order?.roundOff ?? 0);
  const totalAmount =
    Math.round((subtotal + taxAmount - discount + roundOff) * 100) / 100;

  // Delete old tax records and create new ones
  await prisma.orderTax.deleteMany({ where: { orderId } });

  if (taxBreakdown.length > 0) {
    await prisma.orderTax.createMany({
      data: taxBreakdown.map((t) => ({
        orderId,
        taxName: t.taxName,
        taxPercent: t.taxPercent,
        taxAmount: Math.round(t.taxAmount * 100) / 100,
      })),
    });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount,
    },
  });
}
