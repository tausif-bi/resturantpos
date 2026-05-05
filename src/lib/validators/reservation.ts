import { z } from "zod";
import { phoneSchema } from "./customer";

export const reservationStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "SEATED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
]);

export const reservationSchema = z.object({
  customerName: z.string().min(1, "Name is required").max(80),
  phone: phoneSchema,
  partySize: z.coerce.number().int().min(1).max(50),
  scheduledFor: z.coerce.date(),
  tableId: z.string().nullable().optional(),
  notes: z.string().max(300).nullable().optional(),
});

export type ReservationFormData = z.infer<typeof reservationSchema>;
