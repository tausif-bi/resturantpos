import { z } from "zod";

export const createOrderSchema = z
  .object({
    tableId: z.string().optional(),
    type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY", "ONLINE"]).default("DINE_IN"),
    customerId: z.string().optional(),
  })
  .refine(
    (data) => data.type !== "DINE_IN" || (data.tableId != null && data.tableId.length > 0),
    { message: "Table is required for dine-in orders", path: ["tableId"] }
  );

export const addItemSchema = z.object({
  orderId: z.string().min(1),
  menuItemId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  notes: z.string().max(500).optional(),
  addOnIds: z.array(z.string()).default([]),
});

export const updateItemQtySchema = z.object({
  orderItemId: z.string().min(1),
  quantity: z.number().int().min(0),
});

export const discountSchema = z.object({
  orderId: z.string().min(1),
  discountAmount: z.number().min(0),
  discountReason: z.string().max(200).optional(),
});

export const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  mode: z.enum(["CASH", "CARD", "UPI", "WALLET", "SPLIT"]),
  amount: z.number().min(0.01),
  reference: z.string().max(200).optional(),
});

export const orderMetaSchema = z.object({
  orderId: z.string().min(1),
  persons: z.number().int().min(0).max(99).nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const orderRoundOffSchema = z.object({
  orderId: z.string().min(1),
  roundOff: z.number().min(-99).max(99),
});

export const orderComplimentarySchema = z.object({
  orderId: z.string().min(1),
  complimentary: z.boolean(),
});

export const orderCustomerPaidSchema = z.object({
  orderId: z.string().min(1),
  customerPaid: z.number().min(0).nullable(),
});

export type CreateOrderFormData = z.infer<typeof createOrderSchema>;
export type AddItemFormData = z.infer<typeof addItemSchema>;
export type UpdateItemQtyFormData = z.infer<typeof updateItemQtySchema>;
export type DiscountFormData = z.infer<typeof discountSchema>;
export type CreatePaymentFormData = z.infer<typeof createPaymentSchema>;
export type OrderMetaFormData = z.infer<typeof orderMetaSchema>;
export type OrderRoundOffFormData = z.infer<typeof orderRoundOffSchema>;
export type OrderComplimentaryFormData = z.infer<typeof orderComplimentarySchema>;
export type OrderCustomerPaidFormData = z.infer<typeof orderCustomerPaidSchema>;
