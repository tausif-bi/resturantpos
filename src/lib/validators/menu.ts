import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const menuItemSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Item name is required").max(200),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  basePrice: z.number().min(0, "Price must be positive"),
  isVeg: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  preparationTime: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).default(0),
  taxConfigIds: z.array(z.string()).default([]),
});

export const variantSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1, "Variant name is required").max(100),
  price: z.number().min(0, "Price must be positive"),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const addOnSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1, "Add-on name is required").max(100),
  price: z.number().min(0, "Price must be positive"),
  isAvailable: z.boolean().default(true),
});

export const taxConfigSchema = z.object({
  name: z.string().min(1, "Tax name is required").max(100),
  percentage: z.number().min(0).max(100),
  isInclusive: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
export type MenuItemFormData = z.infer<typeof menuItemSchema>;
export type VariantFormData = z.infer<typeof variantSchema>;
export type AddOnFormData = z.infer<typeof addOnSchema>;
export type TaxConfigFormData = z.infer<typeof taxConfigSchema>;
