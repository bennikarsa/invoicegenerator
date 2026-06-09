import { NextResponse } from "next/server";

import { isBlankBulkRow, pickBulkValue, type BulkImportResult } from "@/lib/bulk-import";
import { sanitizeCustomerInput, validateCustomerInput } from "@/lib/customers";
import { getCurrentAuthSession } from "@/lib/server-auth";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function unauthorizedResponse() {
  return NextResponse.json({ ok: false, message: "Session login tidak valid." }, { status: 401 });
}

type CustomersBulkBody = {
  rows?: unknown;
};

export async function POST(request: Request) {
  if (!getCurrentAuthSession()) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as CustomersBulkBody | null;
  const rows = Array.isArray(body?.rows) ? body.rows : [];

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, message: "File belum berisi data pembeli." }, { status: 400 });
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

    const input = sanitizeCustomerInput({
      name: pickBulkValue(record, ["nama", "name", "nama pembeli"]),
      phone: String(pickBulkValue(record, ["whatsapp", "wa", "nomor whatsapp", "no hp", "phone"]) ?? ""),
      address: pickBulkValue(record, ["alamat", "address"])
    });
    const validation = validateCustomerInput(input);

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
    return NextResponse.json({ ok: false, message: "Tidak ada baris pembeli yang bisa diimport." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("customers").insert(inputs);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: inputs.length, skipped });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal import pembeli."
      },
      { status: 500 }
    );
  }
}
