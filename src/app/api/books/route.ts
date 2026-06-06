import { NextResponse } from "next/server";

import {
  sanitizeAdminBookInput,
  sanitizePublicBookInput,
  validateAdminBookInput,
  validatePublicBookInput
} from "@/lib/books";
import { getCurrentAuthSession } from "@/lib/server-auth";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function unauthorizedResponse() {
  return NextResponse.json({ ok: false, message: "Session login tidak valid." }, { status: 401 });
}

export async function GET(request: Request) {
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const selectColumns =
    session.role === "admin"
      ? "id,title,harga_modal,harga_komunitas,harga_jual,created_at"
      : "id,title,harga_komunitas,harga_jual,created_at";

  try {
    const supabase = createSupabaseClient();
    let query = supabase
      .from("books")
      .select(selectColumns)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, role: session.role, books: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal membaca data buku."
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
    Record<"title" | "harga_modal" | "harga_komunitas" | "harga_jual", unknown>
  > | null;
  const input =
    session.role === "admin"
      ? sanitizeAdminBookInput(body ?? {})
      : {
          ...sanitizePublicBookInput(body ?? {}),
          harga_modal: 0
        };
  const validation =
    session.role === "admin" ? validateAdminBookInput(input) : validatePublicBookInput(input);

  if (!validation.ok) {
    return NextResponse.json(validation, { status: 400 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("books")
      .insert(input)
      .select("id,title,harga_modal,harga_komunitas,harga_jual,created_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, book: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal menyimpan buku."
      },
      { status: 500 }
    );
  }
}
