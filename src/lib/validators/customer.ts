import { z } from "zod";

// Indian mobile: exactly 10 digits, first digit 6-9. Stored without country code.
export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const customerDetailsSchema = z
  .object({
    orderType: z.enum(["TAKEAWAY", "DELIVERY"]),
    phone: phoneSchema,
    name: z.string().min(1, "Name is required").max(80),
    address: z.string().max(300).optional().nullable(),
    locality: z.string().max(80).optional().nullable(),
    notes: z.string().max(300).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.orderType === "DELIVERY") {
      if (!val.address || val.address.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["address"],
          message: "Address is required for delivery orders",
        });
      }
      if (!val.locality || val.locality.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["locality"],
          message: "Locality is required for delivery orders",
        });
      }
    }
  });

export type CustomerDetails = z.infer<typeof customerDetailsSchema>;

// Display helper: phone with +91 prefix.
export function formatPhone(phone: string): string {
  return `+91 ${phone}`;
}
