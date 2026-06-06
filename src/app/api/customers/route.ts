import { NextResponse } from "next/server";

import { sanitizeCustomerInput, validateCustomerInput } from "@/lib/customers";
import { getCurrentAuthSession } from "@/lib/server-auth";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function unauthorizedResponse() {
  return NextResponse.json({ ok: false, message: "Session login tidak valid." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!getCurrentAuthSession()) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  try {
    const supabase = createSupabaseClient();
    let query = supabase
      .from("customers")
      .select("id,name,phone,address,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, customers: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal membaca data pembeli."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!getCurrentAuthSession()) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as Partial<
    Record<"name" | "phone" | "address", unknown>
  > | null;
  const input = sanitizeCustomerInput(body ?? {});
  const validation = validateCustomerInput(input);

  if (!validation.ok) {
    return NextResponse.json(validation, { status: 400 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("customers")
      .insert(input)
      .select("id,name,phone,address,created_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, customer: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal menyimpan pembeli."
      },
      { status: 500 }
    );
  }
}
