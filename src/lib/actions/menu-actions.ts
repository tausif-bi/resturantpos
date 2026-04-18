"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";
import { serialize } from "@/lib/utils";
import {
  categorySchema,
  menuItemSchema,
  variantSchema,
  addOnSchema,
  taxConfigSchema,
  type CategoryFormData,
  type MenuItemFormData,
  type VariantFormData,
  type AddOnFormData,
  type TaxConfigFormData,
} from "@/lib/validators/menu";

// ─── Categories ───

export async function getCategories() {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const result = await prisma.category.findMany({
    where: { restaurantId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { menuItems: true } } },
  });
  return serialize(result);
}

export async function createCategory(data: CategoryFormData) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const validated = categorySchema.parse(data);

  const category = await prisma.category.create({
    data: {
      ...validated,
      restaurantId,
    },
  });

  revalidatePath("/menu");
  return serialize(category);
}

export async function updateCategory(id: string, data: CategoryFormData) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const validated = categorySchema.parse(data);

  const category = await prisma.category.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/menu");
  return serialize(category);
}

export async function deleteCategory(id: string) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  // Check if category has items
  const itemCount = await prisma.menuItem.count({
    where: { categoryId: id, restaurantId },
  });

  if (itemCount > 0) {
    throw new Error(
      `Cannot delete category with ${itemCount} menu items. Move or delete them first.`
    );
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/menu");
}

// ─── Menu Items ───

export async function getMenuItems(categoryId?: string) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const result = await prisma.menuItem.findMany({
    where: {
      restaurantId,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      category: true,
      variants: { orderBy: { sortOrder: "asc" } },
      addOns: true,
      taxes: { include: { taxConfig: true } },
    },
  });
  return serialize(result);
}

export async function getMenuItem(id: string) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const result = await prisma.menuItem.findFirst({
    where: { id, restaurantId },
    include: {
      category: true,
      variants: { orderBy: { sortOrder: "asc" } },
      addOns: true,
      taxes: { include: { taxConfig: true } },
    },
  });
  return serialize(result);
}

export async function createMenuItem(data: MenuItemFormData) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const validated = menuItemSchema.parse(data);
  const { taxConfigIds, ...itemData } = validated;

  const item = await prisma.menuItem.create({
    data: {
      ...itemData,
      restaurantId,
      taxes: {
        create: taxConfigIds.map((taxConfigId) => ({
          taxConfigId,
        })),
      },
    },
  });

  revalidatePath("/menu");
  return serialize(item);
}

export async function updateMenuItem(id: string, data: MenuItemFormData) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const validated = menuItemSchema.parse(data);
  const { taxConfigIds, ...itemData } = validated;

  // Delete existing tax links and recreate
  await prisma.menuItemTax.deleteMany({ where: { menuItemId: id } });

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...itemData,
      taxes: {
        create: taxConfigIds.map((taxConfigId) => ({
          taxConfigId,
        })),
      },
    },
  });

  revalidatePath("/menu");
  return serialize(item);
}

export async function deleteMenuItem(id: string) {
  await prisma.menuItem.delete({ where: { id } });
  revalidatePath("/menu");
}

export async function toggleMenuItemAvailability(id: string) {
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) throw new Error("Item not found");

  await prisma.menuItem.update({
    where: { id },
    data: { isAvailable: !item.isAvailable },
  });

  revalidatePath("/menu");
}

// ─── Variants ───

export async function createVariant(data: VariantFormData) {
  const validated = variantSchema.parse(data);

  const variant = await prisma.variant.create({
    data: validated,
  });

  revalidatePath("/menu");
  return serialize(variant);
}

export async function updateVariant(id: string, data: VariantFormData) {
  const validated = variantSchema.parse(data);

  const variant = await prisma.variant.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/menu");
  return serialize(variant);
}

export async function deleteVariant(id: string) {
  await prisma.variant.delete({ where: { id } });
  revalidatePath("/menu");
}

// ─── Add-ons ───

export async function createAddOn(data: AddOnFormData) {
  const validated = addOnSchema.parse(data);

  const addOn = await prisma.addOn.create({
    data: validated,
  });

  revalidatePath("/menu");
  return serialize(addOn);
}

export async function updateAddOn(id: string, data: AddOnFormData) {
  const validated = addOnSchema.parse(data);

  const addOn = await prisma.addOn.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/menu");
  return serialize(addOn);
}

export async function deleteAddOn(id: string) {
  await prisma.addOn.delete({ where: { id } });
  revalidatePath("/menu");
}

// ─── Tax Configs ───

export async function getTaxConfigs() {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const result = await prisma.taxConfig.findMany({
    where: { restaurantId },
    orderBy: { percentage: "asc" },
  });
  return serialize(result);
}

export async function createTaxConfig(data: TaxConfigFormData) {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const validated = taxConfigSchema.parse(data);

  const config = await prisma.taxConfig.create({
    data: {
      ...validated,
      restaurantId,
    },
  });

  revalidatePath("/settings/taxes");
  revalidatePath("/menu");
  return serialize(config);
}

export async function updateTaxConfig(id: string, data: TaxConfigFormData) {
  const validated = taxConfigSchema.parse(data);

  const config = await prisma.taxConfig.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/settings/taxes");
  revalidatePath("/menu");
  return serialize(config);
}

export async function deleteTaxConfig(id: string) {
  await prisma.taxConfig.delete({ where: { id } });
  revalidatePath("/settings/taxes");
  revalidatePath("/menu");
}
