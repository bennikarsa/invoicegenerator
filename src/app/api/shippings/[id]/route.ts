import { NextResponse } from "next/server";

import { sanitizeShippingInput, validateShippingInput } from "@/lib/shippings";
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

export async function PUT(request: Request, { params }: RouteContext) {
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
      .update(input)
      .eq("id", params.id)
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
        message: error instanceof Error ? error.message : "Gagal memperbarui ongkir."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!getCurrentAuthSession()) {
    return unauthorizedResponse();
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("shippings").update({ deleted_at: new Date().toISOString() }).eq("id", params.id);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal menghapus ongkir."
      },
      { status: 500 }
    );
  }
}
