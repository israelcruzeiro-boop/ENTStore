export type SpreadsheetCell = string | number | boolean | null | undefined;
export type SpreadsheetRow = Record<string, SpreadsheetCell>;

interface SheetExport {
  name: string;
  rows: SpreadsheetRow[];
}

export async function exportWorkbook(sheets: SheetExport[], fileName: string): Promise<void> {
  const XLSX = await import('@e965/xlsx');
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  XLSX.writeFile(workbook, fileName);
}

export async function readFirstSheetRows(file: File): Promise<SpreadsheetRow[]> {
  const XLSX = await import('@e965/xlsx');
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  return XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet, { defval: '' });
}
