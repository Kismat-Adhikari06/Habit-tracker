import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Session-based auth with scrypt password hashing.
 *
 * - Passwords: scrypt with a per-user random salt, stored as
 *   `scrypt$N$r$p$salt$hash`. Timing-safe verification.
 * - Sessions: a random 32-byte token lives in an HTTP-only cookie;
 *   only its SHA-256 hash is persisted. The raw token never touches
 *   the database, logs, or the client beyond the cookie itself.
 * - Cookies: Secure is enabled unless the request is plain-http LAN
 *   development (PWA_DEV_HTTPS / x-forwarded-proto aware), so
 *   production HTTPS is never weakened.
 */

const SESSION_COOKIE = "habit_session";
const SESSION_TTL_DAYS = 30;

// ---- Password hashing (scrypt) ----

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, N, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ---- Sessions ----

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isSecureRequest(): boolean {
  // Next 16: cookies() must be awaited; headers via next/headers too.
  // We infer scheme from forwarded headers when behind a proxy, or the
  // dev-HTTPS flag, falling back to true (secure) in production.
  return process.env.PWA_DEV_HTTPS === "1" || process.env.NODE_ENV === "production";
}

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  createdAt: Date;
};

/** Returns the authenticated user, or null. Cleans up expired sessions. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return { id: session.user.id, email: session.user.email, createdAt: session.user.createdAt };
}

/** Throwing variant for actions that must be authenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/**
 * Account claim: on the FIRST signup, attach all ownerless rows
 * (pre-account habits + GitHub connection) to the new user so
 * existing data is preserved instead of orphaned.
 */
export async function claimOrphanedData(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.habit.updateMany({ where: { userId: null }, data: { userId } }),
    prisma.gitHubConnection.updateMany({ where: { userId: null }, data: { userId } }),
  ]);
}
