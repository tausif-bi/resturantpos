import { prisma } from "./db";

export async function generateOrderNumber(
  restaurantId: string
): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.order.count({
    where: {
      restaurantId,
      createdAt: { gte: today },
    },
  });

  const dateStr = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const seq = String(count + 1).padStart(3, "0");

  return `ORD-${dateStr}-${seq}`;
}

export async function generateKOTNumber(
  restaurantId: string
): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.kOT.count({
    where: {
      restaurantId,
      createdAt: { gte: today },
    },
  });

  const seq = String(count + 1).padStart(3, "0");
  return `KOT-${seq}`;
}
