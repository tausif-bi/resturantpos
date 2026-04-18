/**
 * Builds two files:
 *  - menu-import-template.xlsx  (blank template with examples)
 *  - Bombays-Menu-Import.xlsx   (populated from "Bombays Menu 1st April 2026.xlsx")
 *
 * Run:  npx tsx scripts/build-menu-import.ts
 */
import ExcelJS, { Worksheet } from "exceljs";
import path from "path";

type Col = {
  header: string;
  key: string;
  width: number;
  required?: boolean;
  note?: string;
};

const CATEGORY_COLS: Col[] = [
  { header: "Name", key: "name", width: 28, required: true, note: "Unique category name" },
  { header: "SortOrder", key: "sortOrder", width: 12, note: "Lower = shown first" },
  { header: "Description", key: "description", width: 40 },
];

const ITEM_COLS: Col[] = [
  { header: "ItemCode", key: "code", width: 14, required: true, note: "Unique short code — the join key for Variants/AddOns" },
  { header: "Name", key: "name", width: 40, required: true },
  { header: "Category", key: "category", width: 20, required: true, note: "Must match a Name in Categories sheet" },
  { header: "Price", key: "price", width: 10, required: true, note: "Base price (number, no currency symbol)" },
  { header: "IsVeg", key: "isVeg", width: 8, note: "TRUE / FALSE" },
  { header: "IsAvailable", key: "isAvailable", width: 12, note: "TRUE / FALSE (default TRUE)" },
  { header: "Description", key: "description", width: 40 },
  { header: "PrepTime", key: "prepTime", width: 10, note: "Minutes (integer, optional)" },
  { header: "SortOrder", key: "sortOrder", width: 10 },
  { header: "Taxes", key: "taxes", width: 22, note: "Pipe-separated tax names, e.g.  CGST|SGST" },
];

const VARIANT_COLS: Col[] = [
  { header: "ItemCode", key: "code", width: 14, required: true, note: "Must match Items.ItemCode" },
  { header: "VariantName", key: "name", width: 24, required: true, note: "e.g., Small, Medium, Large" },
  { header: "Price", key: "price", width: 10, required: true },
  { header: "IsAvailable", key: "isAvailable", width: 12 },
  { header: "SortOrder", key: "sortOrder", width: 10 },
];

const ADDON_COLS: Col[] = [
  { header: "ItemCode", key: "code", width: 14, required: true, note: "Must match Items.ItemCode" },
  { header: "AddOnName", key: "name", width: 24, required: true },
  { header: "Price", key: "price", width: 10, required: true },
  { header: "IsAvailable", key: "isAvailable", width: 12 },
];

const TAX_COLS: Col[] = [
  { header: "Name", key: "name", width: 16, required: true, note: "Referenced by Items.Taxes" },
  { header: "Percentage", key: "percentage", width: 12, required: true },
  { header: "IsInclusive", key: "isInclusive", width: 12, note: "TRUE = price is tax-inclusive" },
];

// ────────────────────────── styling helpers ──────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFAC2D00" }, // brand primary
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: "Manrope",
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};
const BORDER: ExcelJS.Borders = {
  top: { style: "thin", color: { argb: "FFE5E7EB" } },
  left: { style: "thin", color: { argb: "FFE5E7EB" } },
  bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
  right: { style: "thin", color: { argb: "FFE5E7EB" } },
  diagonal: { style: "thin" },
};

function addHeaderRow(ws: Worksheet, cols: Col[]) {
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  const header = ws.getRow(1);
  header.height = 24;
  header.eachCell((cell, idx) => {
    const col = cols[idx - 1];
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cell.border = BORDER;
    if (col?.note) {
      cell.note = {
        texts: [{ text: col.note }],
        margins: { insetmode: "auto" },
      } as ExcelJS.Comment;
    }
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: cols.length },
  };
}

function styleDataRow(row: ExcelJS.Row, colCount: number) {
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.border = BORDER;
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cell.font = { name: "Inter", size: 10 };
  }
  row.height = 20;
}

// ────────────────────────── README builder ──────────────────────────

function buildReadme(wb: ExcelJS.Workbook, title: string, subtitle: string, totals: { categories: number; items: number; taxes: number }) {
  const ws = wb.addWorksheet("README", {
    views: [{ showGridLines: false }],
  });
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 80;

  const rows: Array<[string, string, { bold?: boolean; size?: number; color?: string; fill?: string; header?: boolean }?]> = [
    ["", title, { bold: true, size: 22, color: "FFAC2D00" }],
    ["", subtitle, { color: "FF64748B", size: 11 }],
    ["", ""],
    ["", `Totals: ${totals.categories} categories · ${totals.items} items · ${totals.taxes} taxes`, { bold: true, size: 11 }],
    ["", ""],
    ["", "How the import works", { bold: true, size: 14, color: "FF0F172A" }],
    ["", "1.  Fill in the Categories sheet first."],
    ["", "2.  Add menu items to the Items sheet — each needs a unique ItemCode (short code)."],
    ["", "3.  Variants and AddOns sheets link to items by ItemCode."],
    ["", "4.  Taxes sheet defines tax configs; reference them in Items.Taxes (pipe-separated)."],
    ["", "5.  Upload the file in the POS: Menu → Import from Excel."],
    ["", ""],
    ["", "Sheet reference", { bold: true, size: 14, color: "FF0F172A" }],
    ["", "Categories", { bold: true, header: true }],
    ["", "Name (required), SortOrder, Description"],
    ["", ""],
    ["", "Items", { bold: true, header: true }],
    ["", "ItemCode*, Name*, Category*, Price*, IsVeg, IsAvailable, Description, PrepTime, SortOrder, Taxes"],
    ["", "  · Category must exactly match a Name in the Categories sheet."],
    ["", "  · Taxes is pipe-separated, e.g.  CGST|SGST"],
    ["", ""],
    ["", "Variants", { bold: true, header: true }],
    ["", "ItemCode*, VariantName*, Price*, IsAvailable, SortOrder"],
    ["", "  · Used when one dish has size/portion options. Price is the variant's selling price."],
    ["", ""],
    ["", "AddOns", { bold: true, header: true }],
    ["", "ItemCode*, AddOnName*, Price*, IsAvailable"],
    ["", "  · Extra paid additions for a dish (extra cheese, egg, etc.)."],
    ["", ""],
    ["", "Taxes", { bold: true, header: true }],
    ["", "Name*, Percentage*, IsInclusive"],
    ["", "  · IsInclusive = TRUE  →  price already contains tax. FALSE → tax added on top."],
    ["", ""],
    ["", "Rules", { bold: true, size: 14, color: "FF0F172A" }],
    ["", "·  Required columns are marked with *"],
    ["", "·  ItemCode must be unique within the Items sheet."],
    ["", "·  Empty rows are ignored — blank separators are fine."],
    ["", "·  Prices are numbers only (no ₹ or commas). TRUE/FALSE for booleans."],
    ["", "·  Names with accents/special characters are preserved."],
    ["", "·  Re-running the import with the same ItemCode will UPDATE the existing item."],
  ];

  rows.forEach((entry, idx) => {
    const [, text, opts] = entry;
    const r = ws.getRow(idx + 2);
    const cell = r.getCell(3);
    cell.value = text;
    cell.font = {
      name: "Inter",
      bold: opts?.bold ?? false,
      size: opts?.size ?? 11,
      color: opts?.color ? { argb: opts.color } : { argb: "FF0F172A" },
    };
    if (opts?.header) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDECE4" } };
    }
  });
}

// ────────────────────────── sheet builders ──────────────────────────

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  cols: Col[],
  rows: Record<string, unknown>[]
) {
  const ws = wb.addWorksheet(name);
  addHeaderRow(ws, cols);
  rows.forEach((r) => {
    const added = ws.addRow(r);
    styleDataRow(added, cols.length);
  });
}

// ────────────────────────── Bombays loader ──────────────────────────

type BombaysRow = {
  name: string;
  code: string;
  category: string;
  price: number;
  halfPrice: number | null;
};

function parsePrice(v: ExcelJS.CellValue): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const parsed = parseFloat(String(v));
  return Number.isFinite(parsed) ? parsed : null;
}

async function loadBombays(): Promise<BombaysRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve("Bombays Menu 1st April 2026.xlsx"));
  const ws = wb.worksheets[0];
  const out: BombaysRow[] = [];
  const seen = new Set<string>();

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = String(row.getCell(1).value ?? "").trim();
    const code = String(row.getCell(2).value ?? "").trim().toUpperCase();
    const category = String(row.getCell(3).value ?? "").trim();
    const fullPrice = parsePrice(row.getCell(4).value);
    const halfPrice = parsePrice(row.getCell(5).value);

    // Skip header rows like: [] [] [] [Full] [Half]
    if (!name || !category) continue;
    if (fullPrice == null) continue;

    let finalCode = code || slugCode(name);
    if (seen.has(finalCode)) {
      let i = 2;
      while (seen.has(`${finalCode}${i}`)) i++;
      finalCode = `${finalCode}${i}`;
    }
    seen.add(finalCode);

    out.push({
      name,
      code: finalCode,
      category,
      price: fullPrice,
      halfPrice: halfPrice && halfPrice > 0 ? halfPrice : null,
    });
  }
  return out;
}

function slugCode(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 8) || "ITEM";
}

function inferIsVeg(name: string): boolean {
  const n = name.toLowerCase();
  const nonVeg = ["chicken", "chi.", "chi ", "prawns", "prawn", "mutton", "fish", "egg", "lamb", "beef", "pork"];
  return !nonVeg.some((k) => n.includes(k));
}

// ────────────────────────── main ──────────────────────────

async function main() {
  // 1) Blank template ------------------------------------------------
  await writeTemplate(path.resolve("menu-import-template.xlsx"), {
    title: "Menu Import Template",
    subtitle: "Fill in the sheets and upload the file from the POS (Menu → Import from Excel).",
    categories: [
      { name: "Starters", sortOrder: 1, description: "Appetizers and small plates" },
      { name: "Mains", sortOrder: 2, description: "Main course dishes" },
      { name: "Beverages", sortOrder: 3, description: "Drinks" },
    ],
    items: [
      {
        code: "PNB",
        name: "Paneer Butter Masala",
        category: "Mains",
        price: 320,
        isVeg: "TRUE",
        isAvailable: "TRUE",
        description: "Cottage cheese in a rich tomato-butter gravy",
        prepTime: 15,
        sortOrder: 1,
        taxes: "CGST|SGST",
      },
      {
        code: "BC",
        name: "Butter Chicken",
        category: "Mains",
        price: 380,
        isVeg: "FALSE",
        isAvailable: "TRUE",
        description: "",
        prepTime: 18,
        sortOrder: 2,
        taxes: "CGST|SGST",
      },
      {
        code: "MLT",
        name: "Masala Chai",
        category: "Beverages",
        price: 60,
        isVeg: "TRUE",
        isAvailable: "TRUE",
        description: "",
        prepTime: 5,
        sortOrder: 1,
        taxes: "CGST|SGST",
      },
    ],
    variants: [
      { code: "PNB", name: "Half", price: 220, isAvailable: "TRUE", sortOrder: 1 },
      { code: "PNB", name: "Full", price: 320, isAvailable: "TRUE", sortOrder: 2 },
    ],
    addOns: [
      { code: "PNB", name: "Extra Paneer", price: 80, isAvailable: "TRUE" },
      { code: "BC", name: "Extra Gravy", price: 60, isAvailable: "TRUE" },
    ],
    taxes: [
      { name: "CGST", percentage: 2.5, isInclusive: "FALSE" },
      { name: "SGST", percentage: 2.5, isInclusive: "FALSE" },
    ],
  });

  // 2) Bombays import -----------------------------------------------
  const bombays = await loadBombays();
  const categoryStats = new Map<string, number>();
  for (const r of bombays) categoryStats.set(r.category, (categoryStats.get(r.category) ?? 0) + 1);

  const categories = Array.from(categoryStats.keys()).map((name, idx) => ({
    name,
    sortOrder: idx + 1,
    description: "",
  }));

  const items = bombays.map((r, idx) => ({
    code: r.code,
    name: r.name,
    category: r.category,
    price: r.price,
    isVeg: inferIsVeg(r.name) ? "TRUE" : "FALSE",
    isAvailable: "TRUE",
    description: "",
    prepTime: "",
    sortOrder: idx + 1,
    taxes: "CGST|SGST",
  }));

  // Build variants: items with a Half price get both "Full" and "Half" rows.
  const variants: Record<string, unknown>[] = [];
  for (const r of bombays) {
    if (r.halfPrice == null) continue;
    variants.push({
      code: r.code,
      name: "Full",
      price: r.price,
      isAvailable: "TRUE",
      sortOrder: 1,
    });
    variants.push({
      code: r.code,
      name: "Half",
      price: r.halfPrice,
      isAvailable: "TRUE",
      sortOrder: 2,
    });
  }

  await writeTemplate(path.resolve("Bombays-Menu-Import.xlsx"), {
    title: "Bombays Menu — Ready to Import",
    subtitle: "Generated from \"Bombays Menu 1st April 2026.xlsx\". Review and upload in the POS.",
    categories,
    items,
    variants,
    addOns: [],
    taxes: [
      { name: "CGST", percentage: 2.5, isInclusive: "FALSE" },
      { name: "SGST", percentage: 2.5, isInclusive: "FALSE" },
    ],
  });

  const halfCount = bombays.filter((r) => r.halfPrice != null).length;
  console.log(`  · ${halfCount} items have Full + Half portions → ${variants.length} variant rows`);

  console.log("");
  console.log("✓ Wrote menu-import-template.xlsx");
  console.log(`✓ Wrote Bombays-Menu-Import.xlsx  (${categories.length} categories · ${items.length} items)`);
}

type Payload = {
  title: string;
  subtitle: string;
  categories: Record<string, unknown>[];
  items: Record<string, unknown>[];
  variants: Record<string, unknown>[];
  addOns: Record<string, unknown>[];
  taxes: Record<string, unknown>[];
};

async function writeTemplate(outPath: string, p: Payload) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RestroPOS";
  wb.created = new Date();

  buildReadme(wb, p.title, p.subtitle, {
    categories: p.categories.length,
    items: p.items.length,
    taxes: p.taxes.length,
  });
  addSheet(wb, "Categories", CATEGORY_COLS, p.categories);
  addSheet(wb, "Items", ITEM_COLS, p.items);
  addSheet(wb, "Variants", VARIANT_COLS, p.variants);
  addSheet(wb, "AddOns", ADDON_COLS, p.addOns);
  addSheet(wb, "Taxes", TAX_COLS, p.taxes);

  await wb.xlsx.writeFile(outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
