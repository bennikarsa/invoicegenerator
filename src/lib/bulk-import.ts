export type BulkImportResult = {
  row: number;
  message: string;
};

export type BulkValidationResult<T> =
  | {
      ok: true;
      rows: T[];
      skipped: number;
    }
  | {
      ok: false;
      errors: BulkImportResult[];
      skipped: number;
    };

export function isBlankBulkRow(row: Record<string, unknown>) {
  return Object.values(row).every((value) => String(value ?? "").trim() === "");
}

export function normalizeBulkHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function pickBulkValue(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeBulkHeader);

  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.includes(normalizeBulkHeader(key))) {
      return value;
    }
  }

  return "";
}
