import { NextResponse } from "next/server";

import {
  sanitizeAdminBookInput,
  sanitizePublicBookInput,
  validateAdminBookInput,
  validatePublicBookInput
} from "@/lib/books";
import { isBlankBulkRow, pickBulkValue, type BulkImportResult } from "@/lib/bulk-import";
import { getCurrentAuthSession } from "@/lib/server-auth";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function unauthorizedResponse() {
  return NextResponse.json({ ok: false, message: "Session login tidak valid." }, { status: 401 });
}

type BooksBulkBody = {
  rows?: unknown;
};

export async function POST(request: Request) {
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as BooksBulkBody | null;
  const rows = Array.isArray(body?.rows) ? body.rows : [];

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, message: "File belum berisi data buku." }, { status: 400 });
  }

  const errors: BulkImportResult[] = [];
  let skipped = 0;
  const inputs = rows.flatMap((row, index) => {
    const rowNumber = index + 2;

    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push({ row: rowNumber, message: "Format baris tidak valid." });
      return [];
    }

    const record = row as Record<string, unknown>;

    if (isBlankBulkRow(record)) {
      skipped += 1;
      return [];
    }

    const rawInput = {
      title: pickBulkValue(record, ["judul", "title", "nama buku"]),
      harga_modal: pickBulkValue(record, ["harga dasar", "harga modal", "modal"]),
      harga_komunitas: pickBulkValue(record, ["harga komunitas", "komunitas"]),
      harga_jual: pickBulkValue(record, ["harga jual", "jual"])
    };
    const input =
      session.role === "admin"
        ? sanitizeAdminBookInput(rawInput)
        : {
            ...sanitizePublicBookInput(rawInput),
            harga_modal: 0
          };
    const validation =
      session.role === "admin" ? validateAdminBookInput(input) : validatePublicBookInput(input);

    if (!validation.ok) {
      errors.push({ row: rowNumber, message: validation.message });
      return [];
    }

    return [input];
  });

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors, skipped }, { status: 400 });
  }

  if (inputs.length === 0) {
    return NextResponse.json({ ok: false, message: "Tidak ada baris buku yang bisa diimport." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("books").insert(inputs);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: inputs.length, skipped });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal import buku."
      },
      { status: 500 }
    );
  }
}
