"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";
import { serialize } from "@/lib/utils";
import {
  reservationSchema,
  type ReservationFormData,
} from "@/lib/validators/reservation";
import type { ReservationStatus } from "@prisma/client";

export async function getReservations(opts?: {
  from?: Date;
  to?: Date;
  status?: ReservationStatus | "ALL";
}) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      ...(opts?.from || opts?.to
        ? {
            scheduledFor: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
      ...(opts?.status && opts.status !== "ALL"
        ? { status: opts.status }
        : {}),
    },
    include: {
      table: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { scheduledFor: "asc" },
  });
  return serialize(reservations);
}

export async function createReservation(data: ReservationFormData) {
  const { restaurantId, userId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const validated = reservationSchema.parse(data);

  if (validated.tableId) {
    const owned = await prisma.table.findFirst({
      where: { id: validated.tableId, restaurantId },
      select: { id: true },
    });
    if (!owned) throw new Error("Selected table not found");
  }

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId,
      customerName: validated.customerName,
      phone: validated.phone,
      partySize: validated.partySize,
      scheduledFor: validated.scheduledFor,
      tableId: validated.tableId ?? null,
      notes: validated.notes ?? null,
      status: "PENDING",
      createdById: userId,
    },
  });

  revalidatePath("/reservations");
  return serialize(reservation);
}

export async function updateReservation(id: string, data: ReservationFormData) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const existing = await prisma.reservation.findUnique({
    where: { id },
    select: { restaurantId: true },
  });
  if (!existing || existing.restaurantId !== restaurantId) {
    throw new Error("Reservation not found");
  }

  const validated = reservationSchema.parse(data);

  if (validated.tableId) {
    const owned = await prisma.table.findFirst({
      where: { id: validated.tableId, restaurantId },
      select: { id: true },
    });
    if (!owned) throw new Error("Selected table not found");
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      customerName: validated.customerName,
      phone: validated.phone,
      partySize: validated.partySize,
      scheduledFor: validated.scheduledFor,
      tableId: validated.tableId ?? null,
      notes: validated.notes ?? null,
    },
  });

  revalidatePath("/reservations");
  return serialize(reservation);
}

export async function setReservationStatus(
  id: string,
  status: ReservationStatus
) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const existing = await prisma.reservation.findUnique({
    where: { id },
    select: { restaurantId: true },
  });
  if (!existing || existing.restaurantId !== restaurantId) {
    throw new Error("Reservation not found");
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/reservations");
  return serialize(reservation);
}

export async function deleteReservation(id: string) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const existing = await prisma.reservation.findUnique({
    where: { id },
    select: { restaurantId: true },
  });
  if (!existing || existing.restaurantId !== restaurantId) {
    throw new Error("Reservation not found");
  }

  await prisma.reservation.delete({ where: { id } });
  revalidatePath("/reservations");
}
