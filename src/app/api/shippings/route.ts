import { NextResponse } from "next/server";

import { sanitizeShippingInput, validateShippingInput } from "@/lib/shippings";
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
      .from("shippings")
      .select("id,ekspedisi,tarif,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("ekspedisi", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, shippings: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal membaca data ongkir."
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
    Record<"ekspedisi" | "tarif", unknown>
  > | null;
  const input = sanitizeShippingInput(body ?? {});
  const validation = validateShippingInput(input);

  if (!validation.ok) {
    return NextResponse.json(validation, { status: 400 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("shippings")
      .insert(input)
      .select("id,ekspedisi,tarif,created_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, shipping: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal menyimpan ongkir."
      },
      { status: 500 }
    );
  }
}
