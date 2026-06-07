import { NextResponse } from "next/server";

import { getCurrentAuthSession } from "@/lib/server-auth";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function unauthorizedResponse() {
  return NextResponse.json({ ok: false, message: "Session login tidak valid." }, { status: 401 });
}

function forbiddenResponse() {
  return NextResponse.json({ ok: false, message: "Hanya admin yang bisa reset semua data." }, { status: 403 });
}

async function deleteAllFrom(tableName: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from(tableName)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST() {
  const session = getCurrentAuthSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (session.role !== "admin") {
    return forbiddenResponse();
  }

  try {
    await deleteAllFrom("invoice_items");
    await deleteAllFrom("invoices");
    await deleteAllFrom("books");
    await deleteAllFrom("customers");
    await deleteAllFrom("shippings");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal reset data."
      },
      { status: 500 }
    );
  }
}
