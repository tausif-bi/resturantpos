"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/utils";
import {
  createPaymentSchema,
  type CreatePaymentFormData,
} from "@/lib/validators/order";
import { completeOrder } from "./order-actions";

export async function createPayment(data: CreatePaymentFormData) {
  const validated = createPaymentSchema.parse(data);

  const payment = await prisma.payment.create({
    data: {
      orderId: validated.orderId,
      mode: validated.mode,
      amount: validated.amount,
      reference: validated.reference,
      status: "COMPLETED",
    },
  });

  // Check if order is fully paid
  const order = await prisma.order.findUnique({
    where: { id: validated.orderId },
    select: { totalAmount: true },
  });

  const totalPaid = await prisma.payment.aggregate({
    where: { orderId: validated.orderId, status: "COMPLETED" },
    _sum: { amount: true },
  });

  const paid = Number(totalPaid._sum.amount ?? 0);
  const total = Number(order?.totalAmount ?? 0);

  if (paid >= total && total > 0) {
    await completeOrder(validated.orderId);
  }

  revalidatePath("/pos");
  return serialize(payment);
}

export async function getPaymentsByOrder(orderId: string) {
  const result = await prisma.payment.findMany({
    where: { orderId },
    orderBy: { receivedAt: "desc" },
  });
  return serialize(result);
}
