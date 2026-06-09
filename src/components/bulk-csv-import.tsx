"use client";

import { ChangeEvent, useMemo, useState } from "react";

type BulkCsvImportProps = {
  title: string;
  description: string;
  endpoint: string;
  templateColumns: string[];
  onImported: () => Promise<void> | void;
};

type BulkImportResponse =
  | {
      ok: true;
      inserted: number;
      skipped: number;
    }
  | {
      ok: false;
      message?: string;
      errors?: Array<{
        row: number;
        message: string;
      }>;
      skipped?: number;
    };

type ParsedRow = Record<string, unknown>;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && isQuoted && nextChar === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      isQuoted = !isQuoted;
      continue;
    }

    if (char === "," && !isQuoted) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !isQuoted) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell.trim());
  rows.push(currentRow);

  return rows.filter((row) => row.some((cell) => cell !== ""));
}

export function BulkCsvImport({
  title,
  description,
  endpoint,
  templateColumns,
  onImported
}: BulkCsvImportProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const previewRows = rows.slice(0, 5);
  const previewColumns = useMemo(() => {
    const columns = new Set<string>();

    previewRows.forEach((row) => {
      Object.keys(row).forEach((key) => columns.add(key));
    });

    return Array.from(columns).slice(0, 6);
  }, [previewRows]);

  async function parseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setRows([]);
    setError("");
    setMessage("");

    if (!file) {
      return;
    }

    setIsParsing(true);

    try {
      const parsedCsv = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
      const headers = (parsedCsv[0] ?? []).map((value) => String(value ?? "").trim());

      if (headers.length === 0) {
        setError("File CSV tidak memiliki header kolom.");
        return;
      }

      const parsedRows = parsedCsv.slice(1).map((csvRow) =>
        headers.reduce<ParsedRow>((row, header, index) => {
          if (header) {
            row[header] = csvRow[index] ?? "";
          }

          return row;
        }, {})
      );

      setRows(parsedRows);
      setMessage(`${parsedRows.length} baris terbaca dari ${file.name}.`);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Gagal membaca file CSV.");
    } finally {
      setIsParsing(false);
    }
  }

  function downloadTemplate() {
    const csv = `\uFEFF${templateColumns.join(",")}\n`;
    const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-template.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async function importRows() {
    setError("");
    setMessage("");
    setIsImporting(true);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ rows })
    });
    const result = (await response.json()) as BulkImportResponse;

    setIsImporting(false);

    if (!result.ok) {
      const errorMessage =
        result.errors && result.errors.length > 0
          ? result.errors.map((item) => `Baris ${item.row}: ${item.message}`).join(" ")
          : result.message ?? "Gagal import data.";

      setError(errorMessage);
      return;
    }

    setRows([]);
    setFileKey((current) => current + 1);
    setMessage(`Berhasil import ${result.inserted} data${result.skipped ? `, ${result.skipped} baris kosong dilewati` : ""}.`);
    await onImported();
  }

  return (
    <section className="space-y-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          onClick={downloadTemplate}
          type="button"
        >
          Download Template
        </button>
        <label className="inline-flex cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Pilih CSV
          <input
            accept=".csv,text/csv"
            className="sr-only"
            key={fileKey}
            onChange={parseFile}
            type="file"
          />
        </label>
      </div>

      {isParsing ? <p className="text-sm text-slate-600">Membaca file CSV...</p> : null}
      {message ? <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p> : null}
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{error}</p> : null}

      {previewRows.length > 0 ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {previewColumns.map((column) => (
                    <th className="px-2 py-2 font-semibold" key={column}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, index) => (
                  <tr key={index}>
                    {previewColumns.map((column) => (
                      <td className="truncate px-2 py-2 text-slate-700" key={column}>
                        {String(row[column] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isImporting || rows.length === 0}
            onClick={importRows}
            type="button"
          >
            {isImporting ? "Mengimport..." : `Import ${rows.length} Baris`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
