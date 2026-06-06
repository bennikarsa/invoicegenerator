import { NextResponse } from "next/server";

import { getCurrentAuthSession } from "@/lib/server-auth";
import { createSupabaseClient } from "@/lib/supabase";
import { rowsToSettings, sanitizeSettings, SETTINGS_KEYS, validateSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function unauthorizedResponse() {
  return NextResponse.json({ ok: false, message: "Session login tidak valid." }, { status: 401 });
}

export async function GET() {
  if (!getCurrentAuthSession()) {
    return unauthorizedResponse();
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from("settings").select("key,value");

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      settings: rowsToSettings(data ?? [])
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal membaca setting."
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!getCurrentAuthSession()) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as Partial<
    Record<(typeof SETTINGS_KEYS)[number], unknown>
  > | null;
  const settings = sanitizeSettings(body ?? {});
  const validation = validateSettings(settings);

  if (!validation.ok) {
    return NextResponse.json(validation, { status: 400 });
  }

  try {
    const supabase = createSupabaseClient();
    const rows = SETTINGS_KEYS.map((key) => ({
      key,
      value: settings[key]
    }));
    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      settings
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal menyimpan setting."
      },
      { status: 500 }
    );
  }
}
