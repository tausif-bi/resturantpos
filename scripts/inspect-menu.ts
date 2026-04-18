import ExcelJS from "exceljs";
import path from "path";

async function main() {
  const target = process.argv[2] || "Bombays-Menu-Import.xlsx";
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve(target));

  console.log(`\nWorkbook: ${target}`);
  for (const ws of wb.worksheets) {
    console.log(`\n─── ${ws.name} ── rows=${ws.rowCount} ───`);
    const preview = ws.name === "README" ? 3 : Math.min(ws.rowCount, 8);
    for (let r = 1; r <= preview; r++) {
      const row = ws.getRow(r);
      const vals: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        const v = row.getCell(c).value;
        vals.push(v == null ? "" : String(v));
      }
      console.log(`  R${r}: ${vals.map((v) => `[${v}]`).join(" ")}`);
    }
    if (ws.name === "Variants" && ws.rowCount > 8) {
      console.log(`  ...`);
      // Show a sample of Khepsa + Rice variants
      for (let r = 30; r <= 38; r++) {
        const row = ws.getRow(r);
        const vals: string[] = [];
        for (let c = 1; c <= ws.columnCount; c++) {
          const v = row.getCell(c).value;
          vals.push(v == null ? "" : String(v));
        }
        console.log(`  R${r}: ${vals.map((v) => `[${v}]`).join(" ")}`);
      }
    }
  }
}

main().catch(console.error);
