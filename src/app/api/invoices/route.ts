import { NextResponse } from "next/server";

import {
  mapInvoicePayload,
  rowsToSettings,
  sanitizeInvoiceSaveInput,
  validateInvoiceSaveInput,
  type InvoicePayload
} from "@/lib/invoices";
import { calculateInvoiceDiscounts } from "@/lib/invoice";
import { getCurrentAuthSession } from "@/lib/server-auth";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const invoiceStatuses = ["draft", "sent", "done", "void"] as const;

function unauthorizedResponse() {
  return NextResponse.json({ ok: false, message: "Session login tidak valid." }, { status: 401 });
}

function getInvoiceSelect(role: "admin" | "komunitas") {
  const itemColumns =
    role === "admin"
      ? "id,invoice_id,book_id,qty,harga_jual_snapshot,harga_komunitas_snapshot,harga_modal_snapshot,books(title)"
      : "id,invoice_id,book_id,qty,harga_jual_snapshot,harga_komunitas_snapshot,books(title)";

  return `id,invoice_number,customer_id,shipping_id,tanggal,diskon_type,diskon_value,diskon_label,diskon_2_type,diskon_2_value,diskon_2_label,status,created_at,customers(id,name,phone,address,created_at),shippings(id,ekspedisi,tarif,created_at),invoice_items(${itemColumns})`;
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

    if (status === "history") {
      query = query.in("status", ["sent", "done", "void"]);
    } else if (invoiceStatuses.includes(status as (typeof invoiceStatuses)[number])) {
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

export async function POST(request: Request) {
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as Partial<
    Record<
      | "customer_id"
      | "shipping_id"
      | "tanggal"
      | "diskon_type"
      | "diskon_value"
      | "diskon_label"
      | "diskon_2_type"
      | "diskon_2_value"
      | "diskon_2_label"
      | "status"
      | "items",
      unknown
    >
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
      return NextResponse.json({ ok: false, message: "Ada produk yang tidak ditemukan." }, { status: 400 });
    }

    const bookById = new Map(books.map((book) => [book.id, book]));
    const itemsWithSnapshots = input.items.map((item) => {
      const book = bookById.get(item.book_id);

      if (!book) {
        throw new Error("Ada produk yang tidak ditemukan.");
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
    const { totalDiscount } = calculateInvoiceDiscounts(subtotal, {
      discountType: input.diskon_type,
      discountValue: input.diskon_value,
      discountLabel: input.diskon_label,
      discount2Type: input.diskon_2_type,
      discount2Value: input.diskon_2_value,
      discount2Label: input.diskon_2_label
    });

    if (totalDiscount > subtotal) {
      return NextResponse.json({ ok: false, message: "Diskon tidak boleh melebihi subtotal produk." }, { status: 400 });
    }

    const { data: savedRows, error: saveError } = await supabase.rpc("save_invoice_with_items", {
      p_invoice_id: null,
      p_customer_id: input.customer_id,
      p_shipping_id: input.shipping_id,
      p_tanggal: input.tanggal,
      p_diskon_type: input.diskon_type,
      p_diskon_value: input.diskon_value,
      p_diskon_label: input.diskon_label,
      p_diskon_2_type: input.diskon_2_type,
      p_diskon_2_value: input.diskon_2_value,
      p_diskon_2_label: input.diskon_2_label,
      p_status: input.status,
      p_items: itemsWithSnapshots
    });
    const savedInvoice = savedRows?.[0] as { invoice_id: string } | undefined;

    if (saveError || !savedInvoice) {
      return NextResponse.json(
        { ok: false, message: saveError?.message || "Gagal membuat invoice." },
        { status: 500 }
      );
    }

    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .select(getInvoiceSelect(session.role))
      .eq("id", savedInvoice.invoice_id)
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
