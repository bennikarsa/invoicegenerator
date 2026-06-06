import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import type { UserRole } from "@/types";
import { AUTH_COOKIE_NAME, parseAuthSession, type AuthSession, type LoginResult } from "@/lib/auth";

type AccountConfig = {
  role: UserRole;
  username?: string;
  password?: string;
};

const accounts: AccountConfig[] = [
  {
    role: "admin",
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD
  },
  {
    role: "komunitas",
    username: process.env.KOMUNITAS_USERNAME,
    password: process.env.KOMUNITAS_PASSWORD
  }
];

function getCookieSecret() {
  return (
    process.env.AUTH_COOKIE_SECRET ||
    `${process.env.ADMIN_PASSWORD ?? ""}:${process.env.KOMUNITAS_PASSWORD ?? ""}`
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getCookieSecret()).update(payload).digest("base64url");
}

function signaturesMatch(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function validateLogin(username: string, password: string): LoginResult {
  const normalizedUsername = username.trim();
  const account = accounts.find(
    (item) => item.username === normalizedUsername && item.password === password
  );

  if (!account || !account.username) {
    return {
      ok: false,
      message: "Username atau password tidak sesuai."
    };
  }

  const session: AuthSession = {
    role: account.role,
    username: account.username,
    loggedInAt: new Date().toISOString()
  };

  return {
    ok: true,
    session
  };
}

export function createAuthCookieValue(session: AuthSession) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = signPayload(payload);

  return `${payload}.${signature}`;
}

export function parseAuthCookieValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature || !signaturesMatch(signPayload(payload), signature)) {
    return null;
  }

  return parseAuthSession(base64UrlDecode(payload));
}

export function getCurrentAuthSession() {
  return parseAuthCookieValue(cookies().get(AUTH_COOKIE_NAME)?.value);
}
