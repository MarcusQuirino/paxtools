#!/usr/bin/env bun
import * as XLSX from "xlsx";

const sheetName = process.argv[2];
if (!sheetName) {
  console.error("usage: bun scripts/dump-ramo-sheet.ts '<sheet name>'");
  process.exit(1);
}

const wb = XLSX.readFile("progressao-pessoal.xlsx");
const sheet = wb.Sheets[sheetName];
if (!sheet) {
  console.error("sheet not found. available:", wb.SheetNames);
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
  header: 1,
  defval: "",
  blankrows: true,
});

for (let i = 0; i < rows.length; i++) {
  const first = String(rows[i]?.[0] ?? "").trim();
  if (first === "") continue;
  console.log(`${i}\t${first}`);
}
