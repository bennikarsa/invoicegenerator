import { NextResponse } from "next/server";

import {
  mapInvoicePayload,
  rowsToSettings,
  sanitizeInvoiceSaveInput,
  validateInvoiceSaveInput,
  type InvoicePayload
} from "@/lib/invoices";
import { calculateDiscount } from "@/lib/invoice";
import { getCurrentAuthSession } from "@/lib/server-auth";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    id: string;
  };
};

function unauthorizedResponse() {
  return NextResponse.json({ ok: false, message: "Session login tidak valid." }, { status: 401 });
}

function getInvoiceSelect(role: "admin" | "komunitas") {
  const itemColumns =
    role === "admin"
      ? "id,invoice_id,book_id,qty,harga_jual_snapshot,harga_komunitas_snapshot,harga_modal_snapshot,books(title)"
      : "id,invoice_id,book_id,qty,harga_jual_snapshot,harga_komunitas_snapshot,books(title)";

  return `id,invoice_number,customer_id,shipping_id,tanggal,diskon_type,diskon_value,status,created_at,customers(id,name,phone,address,created_at),shippings(id,ekspedisi,tarif,created_at),invoice_items(${itemColumns})`;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("invoices")
      .select(getInvoiceSelect(session.role))
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    const { data: settingsRows } = await supabase.from("settings").select("key,value");

    return NextResponse.json({
      ok: true,
      role: session.role,
      invoice: mapInvoicePayload(data as unknown as InvoicePayload, session.role),
      settings: rowsToSettings(settingsRows ?? [])
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal membaca invoice."
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const supabase = createSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("id,status")
    .eq("id", params.id)
    .single();

  if (existingError) {
    return NextResponse.json({ ok: false, message: existingError.message }, { status: 500 });
  }

  if (existing.status !== "draft") {
    return NextResponse.json({ ok: false, message: "Invoice sent tidak dapat diedit." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Partial<
    Record<"customer_id" | "shipping_id" | "tanggal" | "diskon_type" | "diskon_value" | "status" | "items", unknown>
  > | null;
  const input = sanitizeInvoiceSaveInput(body ?? {});
  const validation = validateInvoiceSaveInput(input);

  if (!validation.ok) {
    return NextResponse.json(validation, { status: 400 });
  }

  const bookIds = input.items.map((item) => item.book_id);
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("id,harga_modal,harga_komunitas,harga_jual")
    .in("id", bookIds);

  if (booksError) {
    return NextResponse.json({ ok: false, message: booksError.message }, { status: 500 });
  }

  if (!books || books.length !== new Set(bookIds).size) {
    return NextResponse.json({ ok: false, message: "Ada buku yang tidak ditemukan." }, { status: 400 });
  }

  const bookById = new Map(books.map((book) => [book.id, book]));
  const itemsWithSnapshots = input.items.map((item) => {
    const book = bookById.get(item.book_id);

    if (!book) {
      throw new Error("Ada buku yang tidak ditemukan.");
    }

    return {
      invoice_id: params.id,
      book_id: item.book_id,
      qty: item.qty,
      harga_jual_snapshot: book.harga_jual,
      harga_komunitas_snapshot: book.harga_komunitas,
      harga_modal_snapshot: book.harga_modal
    };
  });
  const subtotal = itemsWithSnapshots.reduce(
    (total, item) => total + item.harga_jual_snapshot * item.qty,
    0
  );
  const discount = calculateDiscount(subtotal, input.diskon_type, input.diskon_value);

  if (discount > subtotal) {
    return NextResponse.json({ ok: false, message: "Diskon tidak boleh melebihi subtotal buku." }, { status: 400 });
  }

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({
      customer_id: input.customer_id,
      shipping_id: input.shipping_id,
      tanggal: input.tanggal,
      diskon_type: input.diskon_type,
      diskon_value: input.diskon_value,
      status: input.status
    })
    .eq("id", params.id);

  if (invoiceError) {
    return NextResponse.json({ ok: false, message: invoiceError.message }, { status: 500 });
  }

  await supabase.from("invoice_items").delete().eq("invoice_id", params.id);
  const { error: itemsError } = await supabase.from("invoice_items").insert(itemsWithSnapshots);

  if (itemsError) {
    return NextResponse.json({ ok: false, message: itemsError.message }, { status: 500 });
  }

  const { data: invoiceData, error: detailError } = await supabase
    .from("invoices")
    .select(getInvoiceSelect(session.role))
    .eq("id", params.id)
    .single();

  if (detailError) {
    return NextResponse.json({ ok: false, message: detailError.message }, { status: 500 });
  }

  const { data: settingsRows } = await supabase.from("settings").select("key,value");

  return NextResponse.json({
    ok: true,
    invoice: mapInvoicePayload(invoiceData as unknown as InvoicePayload, session.role),
    settings: rowsToSettings(settingsRows ?? [])
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const supabase = createSupabaseClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", params.id)
    .single();

  if (invoiceError) {
    return NextResponse.json({ ok: false, message: invoiceError.message }, { status: 500 });
  }

  if (invoice.status !== "draft") {
    return NextResponse.json({ ok: false, message: "Hanya draft yang dapat dihapus." }, { status: 400 });
  }

  const { error } = await supabase.from("invoices").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
