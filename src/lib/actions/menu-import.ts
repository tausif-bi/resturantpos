"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTenantScope } from "@/lib/tenant";

// ────────────────────────── types ──────────────────────────

export type ImportError = {
  sheet: string;
  row: number;
  field?: string;
  message: string;
};

export type ImportResult = {
  dryRun: boolean;
  success: boolean;
  totals: {
    categoriesCreated: number;
    categoriesUpdated: number;
    taxesCreated: number;
    taxesUpdated: number;
    itemsCreated: number;
    itemsUpdated: number;
    variantsCreated: number;
    addOnsCreated: number;
  };
  errors: ImportError[];
};

type ParsedCategory = { name: string; sortOrder: number; description: string | null };
type ParsedTax = { name: string; percentage: number; isInclusive: boolean };
type ParsedItem = {
  code: string;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
  description: string | null;
  prepTime: number | null;
  sortOrder: number;
  taxes: string[];
};
type ParsedVariant = {
  code: string;
  name: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
};
type ParsedAddOn = {
  code: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

// ────────────────────────── helpers ──────────────────────────

function cellString(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("text" in (v as object)) return String((v as { text: string }).text).trim();
    if ("result" in (v as object)) {
      const r = (v as { result: unknown }).result;
      return r == null ? "" : String(r).trim();
    }
    if ("richText" in (v as object)) {
      const rt = (v as { richText: { text: string }[] }).richText;
      return rt.map((t) => t.text).join("").trim();
    }
  }
  return String(v).trim();
}

function cellNumber(v: ExcelJS.CellValue): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && "result" in (v as object)) {
    const r = (v as { result: unknown }).result;
    if (typeof r === "number") return r;
    const p = parseFloat(String(r));
    return Number.isFinite(p) ? p : null;
  }
  const p = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(p) ? p : null;
}

function cellBool(v: ExcelJS.CellValue, fallback = false): boolean {
  const s = cellString(v).toLowerCase();
  if (s === "") return fallback;
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return fallback;
}

function isRowEmpty(row: ExcelJS.Row, cols: number): boolean {
  for (let c = 1; c <= cols; c++) {
    if (cellString(row.getCell(c)) !== "") return false;
  }
  return true;
}

function getSheet(wb: ExcelJS.Workbook, name: string) {
  const lower = name.toLowerCase();
  return wb.worksheets.find((s) => s.name.trim().toLowerCase() === lower) || null;
}

// ────────────────────────── parsers ──────────────────────────

function parseCategories(
  ws: ExcelJS.Worksheet | null,
  errors: ImportError[]
): ParsedCategory[] {
  if (!ws) return [];
  const out: ParsedCategory[] = [];
  const seen = new Set<string>();

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (isRowEmpty(row, 3)) continue;

    const name = cellString(row.getCell(1));
    if (!name) {
      errors.push({ sheet: "Categories", row: r, field: "Name", message: "Name is required" });
      continue;
    }
    if (seen.has(name.toLowerCase())) {
      errors.push({ sheet: "Categories", row: r, field: "Name", message: `Duplicate category "${name}"` });
      continue;
    }
    seen.add(name.toLowerCase());

    out.push({
      name,
      sortOrder: cellNumber(row.getCell(2).value) ?? out.length + 1,
      description: cellString(row.getCell(3)) || null,
    });
  }
  return out;
}

function parseTaxes(ws: ExcelJS.Worksheet | null, errors: ImportError[]): ParsedTax[] {
  if (!ws) return [];
  const out: ParsedTax[] = [];
  const seen = new Set<string>();

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (isRowEmpty(row, 3)) continue;

    const name = cellString(row.getCell(1));
    const percentage = cellNumber(row.getCell(2).value);

    if (!name) {
      errors.push({ sheet: "Taxes", row: r, field: "Name", message: "Name is required" });
      continue;
    }
    if (percentage == null || percentage < 0 || percentage > 100) {
      errors.push({
        sheet: "Taxes",
        row: r,
        field: "Percentage",
        message: "Percentage must be a number between 0 and 100",
      });
      continue;
    }
    if (seen.has(name.toLowerCase())) {
      errors.push({ sheet: "Taxes", row: r, field: "Name", message: `Duplicate tax "${name}"` });
      continue;
    }
    seen.add(name.toLowerCase());

    out.push({ name, percentage, isInclusive: cellBool(row.getCell(3).value, false) });
  }
  return out;
}

function parseItems(ws: ExcelJS.Worksheet | null, errors: ImportError[]): ParsedItem[] {
  if (!ws) return [];
  const out: ParsedItem[] = [];
  const seenCodes = new Set<string>();

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (isRowEmpty(row, 10)) continue;

    const code = cellString(row.getCell(1)).toUpperCase();
    const name = cellString(row.getCell(2));
    const category = cellString(row.getCell(3));
    const price = cellNumber(row.getCell(4).value);

    if (!code) {
      errors.push({ sheet: "Items", row: r, field: "ItemCode", message: "ItemCode is required" });
      continue;
    }
    if (!name) {
      errors.push({ sheet: "Items", row: r, field: "Name", message: "Name is required" });
      continue;
    }
    if (!category) {
      errors.push({ sheet: "Items", row: r, field: "Category", message: "Category is required" });
      continue;
    }
    if (price == null || price < 0) {
      errors.push({ sheet: "Items", row: r, field: "Price", message: "Price must be a non-negative number" });
      continue;
    }
    if (seenCodes.has(code)) {
      errors.push({
        sheet: "Items",
        row: r,
        field: "ItemCode",
        message: `Duplicate ItemCode "${code}"`,
      });
      continue;
    }
    seenCodes.add(code);

    const prepRaw = cellNumber(row.getCell(8).value);
    const taxesRaw = cellString(row.getCell(10));
    const taxes = taxesRaw
      .split("|")
      .map((t) => t.trim())
      .filter(Boolean);

    out.push({
      code,
      name,
      category,
      price,
      isVeg: cellBool(row.getCell(5).value, true),
      isAvailable: cellBool(row.getCell(6).value, true),
      description: cellString(row.getCell(7)) || null,
      prepTime: prepRaw != null && prepRaw >= 0 ? Math.round(prepRaw) : null,
      sortOrder: cellNumber(row.getCell(9).value) ?? out.length + 1,
      taxes,
    });
  }
  return out;
}

function parseVariants(ws: ExcelJS.Worksheet | null, errors: ImportError[]): ParsedVariant[] {
  if (!ws) return [];
  const out: ParsedVariant[] = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (isRowEmpty(row, 5)) continue;

    const code = cellString(row.getCell(1)).toUpperCase();
    const name = cellString(row.getCell(2));
    const price = cellNumber(row.getCell(3).value);

    if (!code || !name) {
      errors.push({ sheet: "Variants", row: r, message: "ItemCode and VariantName are required" });
      continue;
    }
    if (price == null || price < 0) {
      errors.push({ sheet: "Variants", row: r, field: "Price", message: "Price must be a non-negative number" });
      continue;
    }

    out.push({
      code,
      name,
      price,
      isAvailable: cellBool(row.getCell(4).value, true),
      sortOrder: cellNumber(row.getCell(5).value) ?? out.length + 1,
    });
  }
  return out;
}

function parseAddOns(ws: ExcelJS.Worksheet | null, errors: ImportError[]): ParsedAddOn[] {
  if (!ws) return [];
  const out: ParsedAddOn[] = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (isRowEmpty(row, 4)) continue;

    const code = cellString(row.getCell(1)).toUpperCase();
    const name = cellString(row.getCell(2));
    const price = cellNumber(row.getCell(3).value);

    if (!code || !name) {
      errors.push({ sheet: "AddOns", row: r, message: "ItemCode and AddOnName are required" });
      continue;
    }
    if (price == null || price < 0) {
      errors.push({ sheet: "AddOns", row: r, field: "Price", message: "Price must be a non-negative number" });
      continue;
    }

    out.push({
      code,
      name,
      price,
      isAvailable: cellBool(row.getCell(4).value, true),
    });
  }
  return out;
}

// ────────────────────────── main action ──────────────────────────

export async function importMenuFromExcel(formData: FormData): Promise<ImportResult> {
  const { restaurantId } = await getTenantScope();
  if (!restaurantId) throw new Error("No restaurant selected");

  const file = formData.get("file");
  const dryRun = formData.get("dryRun") === "true";

  if (!file || !(file instanceof Blob)) {
    throw new Error("No file uploaded");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File too large (max 10 MB)");
  }

  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(arrayBuffer as ArrayBuffer);
  } catch {
    throw new Error("Could not read Excel file — is it a valid .xlsx?");
  }

  const errors: ImportError[] = [];
  const categories = parseCategories(getSheet(wb, "Categories"), errors);
  const taxes = parseTaxes(getSheet(wb, "Taxes"), errors);
  const items = parseItems(getSheet(wb, "Items"), errors);
  const variants = parseVariants(getSheet(wb, "Variants"), errors);
  const addOns = parseAddOns(getSheet(wb, "AddOns"), errors);

  // Cross-reference validation
  const categoryNames = new Set(categories.map((c) => c.name.toLowerCase()));
  // Include existing DB categories so rows can reference them even if the sheet omits them.
  const existingCategories = await prisma.category.findMany({
    where: { restaurantId },
    select: { id: true, name: true },
  });
  for (const c of existingCategories) categoryNames.add(c.name.toLowerCase());

  const taxNames = new Set(taxes.map((t) => t.name.toLowerCase()));
  const existingTaxes = await prisma.taxConfig.findMany({
    where: { restaurantId },
    select: { id: true, name: true },
  });
  for (const t of existingTaxes) taxNames.add(t.name.toLowerCase());

  const itemCodes = new Set(items.map((i) => i.code));

  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    if (!categoryNames.has(it.category.toLowerCase())) {
      errors.push({
        sheet: "Items",
        row: idx + 2,
        field: "Category",
        message: `Unknown category "${it.category}" — add it to the Categories sheet`,
      });
    }
    for (const taxName of it.taxes) {
      if (!taxNames.has(taxName.toLowerCase())) {
        errors.push({
          sheet: "Items",
          row: idx + 2,
          field: "Taxes",
          message: `Unknown tax "${taxName}" — add it to the Taxes sheet`,
        });
      }
    }
  }

  for (let idx = 0; idx < variants.length; idx++) {
    if (!itemCodes.has(variants[idx].code)) {
      // Could also exist in DB — check below.
      const exists = await prisma.menuItem.findFirst({
        where: { restaurantId, shortCode: variants[idx].code },
        select: { id: true },
      });
      if (!exists) {
        errors.push({
          sheet: "Variants",
          row: idx + 2,
          field: "ItemCode",
          message: `Unknown ItemCode "${variants[idx].code}"`,
        });
      }
    }
  }

  for (let idx = 0; idx < addOns.length; idx++) {
    if (!itemCodes.has(addOns[idx].code)) {
      const exists = await prisma.menuItem.findFirst({
        where: { restaurantId, shortCode: addOns[idx].code },
        select: { id: true },
      });
      if (!exists) {
        errors.push({
          sheet: "AddOns",
          row: idx + 2,
          field: "ItemCode",
          message: `Unknown ItemCode "${addOns[idx].code}"`,
        });
      }
    }
  }

  const totals: ImportResult["totals"] = {
    categoriesCreated: 0,
    categoriesUpdated: 0,
    taxesCreated: 0,
    taxesUpdated: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    variantsCreated: 0,
    addOnsCreated: 0,
  };

  if (errors.length > 0 || dryRun) {
    // Compute what WOULD happen for preview
    const catByLower = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
    for (const c of categories) {
      if (catByLower.has(c.name.toLowerCase())) totals.categoriesUpdated++;
      else totals.categoriesCreated++;
    }
    const taxByLower = new Map(existingTaxes.map((t) => [t.name.toLowerCase(), t]));
    for (const t of taxes) {
      if (taxByLower.has(t.name.toLowerCase())) totals.taxesUpdated++;
      else totals.taxesCreated++;
    }
    const existingItems = await prisma.menuItem.findMany({
      where: { restaurantId, shortCode: { in: items.map((i) => i.code) } },
      select: { id: true, shortCode: true },
    });
    const existingItemCodes = new Set(existingItems.map((i) => i.shortCode));
    for (const it of items) {
      if (existingItemCodes.has(it.code)) totals.itemsUpdated++;
      else totals.itemsCreated++;
    }
    totals.variantsCreated = variants.length;
    totals.addOnsCreated = addOns.length;

    return {
      dryRun: true,
      success: errors.length === 0,
      totals,
      errors,
    };
  }

  // ────── Commit in a single transaction ──────
  await prisma.$transaction(
    async (tx) => {
      // 1. Categories
      const catMap = new Map<string, string>();
      for (const c of existingCategories) catMap.set(c.name.toLowerCase(), c.id);
      for (const c of categories) {
        const existing = catMap.get(c.name.toLowerCase());
        if (existing) {
          await tx.category.update({
            where: { id: existing },
            data: { sortOrder: c.sortOrder, description: c.description },
          });
          totals.categoriesUpdated++;
        } else {
          const created = await tx.category.create({
            data: {
              restaurantId,
              name: c.name,
              sortOrder: c.sortOrder,
              description: c.description,
            },
          });
          catMap.set(c.name.toLowerCase(), created.id);
          totals.categoriesCreated++;
        }
      }

      // 2. Taxes
      const taxMap = new Map<string, string>();
      for (const t of existingTaxes) taxMap.set(t.name.toLowerCase(), t.id);
      for (const t of taxes) {
        const existing = taxMap.get(t.name.toLowerCase());
        if (existing) {
          await tx.taxConfig.update({
            where: { id: existing },
            data: { percentage: new Prisma.Decimal(t.percentage), isInclusive: t.isInclusive },
          });
          totals.taxesUpdated++;
        } else {
          const created = await tx.taxConfig.create({
            data: {
              restaurantId,
              name: t.name,
              percentage: new Prisma.Decimal(t.percentage),
              isInclusive: t.isInclusive,
            },
          });
          taxMap.set(t.name.toLowerCase(), created.id);
          totals.taxesCreated++;
        }
      }

      // 3. Items (upsert by shortCode, then replace taxes link rows)
      const itemMap = new Map<string, string>();
      const existingItems = await tx.menuItem.findMany({
        where: { restaurantId, shortCode: { in: items.map((i) => i.code) } },
        select: { id: true, shortCode: true },
      });
      for (const i of existingItems) {
        if (i.shortCode) itemMap.set(i.shortCode, i.id);
      }

      for (const it of items) {
        const categoryId = catMap.get(it.category.toLowerCase());
        if (!categoryId) throw new Error(`Missing category "${it.category}" for item ${it.code}`);

        const existingId = itemMap.get(it.code);
        let menuItemId: string;
        if (existingId) {
          await tx.menuItem.update({
            where: { id: existingId },
            data: {
              categoryId,
              name: it.name,
              description: it.description,
              basePrice: new Prisma.Decimal(it.price),
              isVeg: it.isVeg,
              isAvailable: it.isAvailable,
              preparationTime: it.prepTime,
              sortOrder: it.sortOrder,
            },
          });
          menuItemId = existingId;
          totals.itemsUpdated++;
        } else {
          const created = await tx.menuItem.create({
            data: {
              restaurantId,
              categoryId,
              shortCode: it.code,
              name: it.name,
              description: it.description,
              basePrice: new Prisma.Decimal(it.price),
              isVeg: it.isVeg,
              isAvailable: it.isAvailable,
              preparationTime: it.prepTime,
              sortOrder: it.sortOrder,
            },
          });
          menuItemId = created.id;
          itemMap.set(it.code, menuItemId);
          totals.itemsCreated++;
        }

        // Refresh tax links: drop all, re-add from sheet
        await tx.menuItemTax.deleteMany({ where: { menuItemId } });
        for (const taxName of it.taxes) {
          const taxId = taxMap.get(taxName.toLowerCase());
          if (taxId) {
            await tx.menuItemTax.create({
              data: { menuItemId, taxConfigId: taxId },
            });
          }
        }
      }

      // 4. Variants — replace all for touched items
      const touchedByVariants = new Set(variants.map((v) => v.code));
      const itemIdsForVariantWipe: string[] = [];
      for (const code of touchedByVariants) {
        const id = itemMap.get(code);
        if (!id) {
          const existing = await tx.menuItem.findFirst({
            where: { restaurantId, shortCode: code },
            select: { id: true },
          });
          if (existing) {
            itemMap.set(code, existing.id);
            itemIdsForVariantWipe.push(existing.id);
          }
        } else {
          itemIdsForVariantWipe.push(id);
        }
      }
      if (itemIdsForVariantWipe.length > 0) {
        await tx.variant.deleteMany({
          where: { menuItemId: { in: itemIdsForVariantWipe } },
        });
      }
      for (const v of variants) {
        const itemId = itemMap.get(v.code);
        if (!itemId) continue;
        await tx.variant.create({
          data: {
            menuItemId: itemId,
            name: v.name,
            price: new Prisma.Decimal(v.price),
            isAvailable: v.isAvailable,
            sortOrder: v.sortOrder,
          },
        });
        totals.variantsCreated++;
      }

      // 5. AddOns — replace all for touched items
      const touchedByAddOns = new Set(addOns.map((a) => a.code));
      const itemIdsForAddOnWipe: string[] = [];
      for (const code of touchedByAddOns) {
        const id = itemMap.get(code);
        if (!id) {
          const existing = await tx.menuItem.findFirst({
            where: { restaurantId, shortCode: code },
            select: { id: true },
          });
          if (existing) {
            itemMap.set(code, existing.id);
            itemIdsForAddOnWipe.push(existing.id);
          }
        } else {
          itemIdsForAddOnWipe.push(id);
        }
      }
      if (itemIdsForAddOnWipe.length > 0) {
        await tx.addOn.deleteMany({
          where: { menuItemId: { in: itemIdsForAddOnWipe } },
        });
      }
      for (const a of addOns) {
        const itemId = itemMap.get(a.code);
        if (!itemId) continue;
        await tx.addOn.create({
          data: {
            menuItemId: itemId,
            name: a.name,
            price: new Prisma.Decimal(a.price),
            isAvailable: a.isAvailable,
          },
        });
        totals.addOnsCreated++;
      }
    },
    { timeout: 60_000, maxWait: 10_000 }
  );

  revalidatePath("/menu");
  revalidatePath("/pos");

  return {
    dryRun: false,
    success: true,
    totals,
    errors: [],
  };
}
