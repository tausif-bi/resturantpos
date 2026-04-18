"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";
import { serialize } from "@/lib/utils";
import { generateOrderNumber } from "@/lib/order-number";
import {
  customerDetailsSchema,
  phoneSchema,
  type CustomerDetails,
} from "@/lib/validators/customer";

export async function lookupCustomerByPhone(phone: string) {
  const { tenantId } = await getTenantScope();

  const parsed = phoneSchema.safeParse(phone);
  if (!parsed.success) return null;

  const customer = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId, phone: parsed.data } },
  });
  return customer ? serialize(customer) : null;
}

export async function createOrderWithCustomer(data: CustomerDetails) {
  const { tenantId, restaurantId, userId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const validated = customerDetailsSchema.parse(data);

  const customer = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId, phone: validated.phone } },
    update: {
      name: validated.name,
      ...(validated.address != null && { address: validated.address }),
      ...(validated.locality != null && { locality: validated.locality }),
      ...(validated.notes != null && { notes: validated.notes }),
    },
    create: {
      tenantId,
      phone: validated.phone,
      name: validated.name,
      address: validated.address ?? null,
      locality: validated.locality ?? null,
      notes: validated.notes ?? null,
    },
  });

  const orderNumber = await generateOrderNumber(restaurantId);
  const order = await prisma.order.create({
    data: {
      orderNumber,
      restaurantId,
      customerId: customer.id,
      createdById: userId,
      type: validated.orderType,
      status: "PENDING",
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
    },
  });

  revalidatePath("/pos");
  return serialize(order);
}
