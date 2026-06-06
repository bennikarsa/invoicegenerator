import type { UserRole } from "@/types";

export const AUTH_SESSION_KEY = "gerai-flp-session";
export const AUTH_COOKIE_NAME = "gerai-flp-auth";

export type AuthSession = {
  role: UserRole;
  username: string;
  loggedInAt: string;
};

export type LoginResult =
  | {
      ok: true;
      session: AuthSession;
    }
  | {
      ok: false;
      message: string;
    };

export function isUserRole(value: string): value is UserRole {
  return value === "admin" || value === "komunitas";
}

export function parseAuthSession(value: string | null): AuthSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AuthSession>;

    if (!parsed.role || !parsed.username || !parsed.loggedInAt || !isUserRole(parsed.role)) {
      return null;
    }

    return {
      role: parsed.role,
      username: parsed.username,
      loggedInAt: parsed.loggedInAt
    };
  } catch {
    return null;
  }
}
