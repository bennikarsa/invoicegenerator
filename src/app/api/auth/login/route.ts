import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { createAuthCookieValue, validateLogin } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        username?: unknown;
        password?: unknown;
      }
    | null;

  if (typeof body?.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json(
      {
        ok: false,
        message: "Username dan password wajib diisi."
      },
      { status: 400 }
    );
  }

  const result = validateLogin(body.username, body.password);

  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }

  const response = NextResponse.json(result);

  response.cookies.set(AUTH_COOKIE_NAME, createAuthCookieValue(result.session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  return response;
}
