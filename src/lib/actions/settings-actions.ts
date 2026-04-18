"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";
import { serialize } from "@/lib/utils";

export async function getRestaurant() {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const result = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });
  return serialize(result);
}

export async function updateRestaurant(data: {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  gstNumber?: string;
  fssaiNumber?: string;
}) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const restaurant = await prisma.restaurant.update({
    where: { id: restaurantId },
    data,
  });

  revalidatePath("/settings/restaurant");
  return restaurant;
}
