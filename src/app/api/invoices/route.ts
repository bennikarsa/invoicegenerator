import { NextResponse } from "next/server";

import {
  formatInvoiceNumber,
  getInvoiceMonthCode,
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

export async function GET(request: Request) {
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  try {
    const supabase = createSupabaseClient();
    let query = supabase
      .from("invoices")
      .select(getInvoiceSelect(session.role))
      .order("created_at", { ascending: false });

    if (status === "draft" || status === "sent") {
      query = query.eq("status", status);
    }

    if (dateFrom) {
      query = query.gte("tanggal", dateFrom);
    }

    if (dateTo) {
      query = query.lte("tanggal", dateTo);
    }

    if (search) {
      const { data: matchingCustomers, error: customersError } = await supabase
        .from("customers")
        .select("id")
        .ilike("name", `%${search}%`);

      if (customersError) {
        return NextResponse.json({ ok: false, message: customersError.message }, { status: 500 });
      }

      const customerIds = (matchingCustomers ?? []).map((customer) => customer.id);

      if (customerIds.length > 0) {
        query = query.or(`invoice_number.ilike.%${search}%,customer_id.in.(${customerIds.join(",")})`);
      } else {
        query = query.ilike("invoice_number", `%${search}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    const invoices = ((data ?? []) as unknown as InvoicePayload[]).map((row) =>
      mapInvoicePayload(row, session.role)
    );

    return NextResponse.json({ ok: true, role: session.role, invoices });
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

async function getNextInvoiceNumber(supabase: ReturnType<typeof createSupabaseClient>, tanggal: string) {
  const monthCode = getInvoiceMonthCode(new Date(tanggal));
  const prefix = `FLP/${monthCode}/`;
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const latest = data?.[0]?.invoice_number;
  const latestSequence = latest ? Number(latest.split("/").at(-1)) : 0;

  return formatInvoiceNumber(monthCode, Number.isFinite(latestSequence) ? latestSequence + 1 : 1);
}

export async function POST(request: Request) {
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as Partial<
    Record<"customer_id" | "shipping_id" | "tanggal" | "diskon_type" | "diskon_value" | "status" | "items", unknown>
  > | null;
  const input = sanitizeInvoiceSaveInput(body ?? {});
  const validation = validateInvoiceSaveInput(input);

  if (!validation.ok) {
    return NextResponse.json(validation, { status: 400 });
  }

  try {
    const supabase = createSupabaseClient();
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

    let invoice = null;
    let lastError = "";

    for (let attempt = 0; attempt < 3 && !invoice; attempt += 1) {
      const invoiceNumber = await getNextInvoiceNumber(supabase, input.tanggal);
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_id: input.customer_id,
          shipping_id: input.shipping_id,
          tanggal: input.tanggal,
          diskon_type: input.diskon_type,
          diskon_value: input.diskon_value,
          status: input.status
        })
        .select("id")
        .single();

      if (!error) {
        invoice = data;
        break;
      }

      lastError = error.message;

      if (!error.message.toLowerCase().includes("duplicate")) {
        break;
      }
    }

    if (!invoice) {
      return NextResponse.json({ ok: false, message: lastError || "Gagal membuat invoice." }, { status: 500 });
    }

    const { error: itemsError } = await supabase.from("invoice_items").insert(
      itemsWithSnapshots.map((item) => ({
        invoice_id: invoice.id,
        ...item
      }))
    );

    if (itemsError) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json({ ok: false, message: itemsError.message }, { status: 500 });
    }

    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .select(getInvoiceSelect(session.role))
      .eq("id", invoice.id)
      .single();

    if (invoiceError) {
      return NextResponse.json({ ok: false, message: invoiceError.message }, { status: 500 });
    }

    const { data: settingsRows } = await supabase.from("settings").select("key,value");

    return NextResponse.json({
      ok: true,
      invoice: mapInvoicePayload(invoiceData as unknown as InvoicePayload, session.role),
      settings: rowsToSettings(settingsRows ?? [])
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal menyimpan invoice."
      },
      { status: 500 }
    );
  }
}
