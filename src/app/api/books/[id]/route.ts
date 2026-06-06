import { NextResponse } from "next/server";

import {
  type AdminBookInput,
  type PublicBookInput,
  sanitizeAdminBookInput,
  sanitizePublicBookInput,
  validateAdminBookInput,
  validatePublicBookInput
} from "@/lib/books";
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
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as Partial<
    Record<"title" | "harga_modal" | "harga_komunitas" | "harga_jual", unknown>
  > | null;
  let input: AdminBookInput | PublicBookInput;
  let validation: { ok: boolean; message: string };

  if (session.role === "admin") {
    const adminInput = sanitizeAdminBookInput(body ?? {});
    input = adminInput;
    validation = validateAdminBookInput(adminInput);
  } else {
    const publicInput = sanitizePublicBookInput(body ?? {});
    input = publicInput;
    validation = validatePublicBookInput(publicInput);
  }

  if (!validation.ok) {
    return NextResponse.json(validation, { status: 400 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("books")
      .update(input)
      .eq("id", params.id)
      .select(
        session.role === "admin"
          ? "id,title,harga_modal,harga_komunitas,harga_jual,created_at"
          : "id,title,harga_komunitas,harga_jual,created_at"
      )
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, book: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal memperbarui buku."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("books").update({ deleted_at: new Date().toISOString() }).eq("id", params.id);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal menghapus buku."
      },
      { status: 500 }
    );
  }
}
