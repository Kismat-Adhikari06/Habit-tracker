"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  verifyPassword,
  claimOrphanedData,
} from "@/lib/auth";

export type AuthResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUpAction(email: string, password: string): Promise<AuthResult> {
  try {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) return { ok: false, error: "Enter a valid email address." };
    if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) return { ok: false, error: "An account with this email already exists." };

    const isFirstAccount = (await prisma.user.count()) === 0;

    const user = await prisma.user.create({
      data: { email: normalized, passwordHash: hashPassword(password) },
    });

    // First account inherits any pre-account data (habits, GitHub connection).
    if (isFirstAccount) {
      await claimOrphanedData(user.id);
    }

    await createSession(user.id);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("signUpAction failed:", e instanceof Error ? e.message : "unknown error");
    return { ok: false, error: "Could not create the account. Try again." };
  }
}

export async function logInAction(email: string, password: string): Promise<AuthResult> {
  try {
    const normalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    // Same generic message for unknown email and wrong password.
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { ok: false, error: "Incorrect email or password." };
    }
    await createSession(user.id);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("logInAction failed:", e instanceof Error ? e.message : "unknown error");
    return { ok: false, error: "Could not sign in. Try again." };
  }
}

export async function logOutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/");
  redirect("/login");
}

export async function getAccount(): Promise<{ email: string } | null> {
  const user = await getSessionUser();
  return user ? { email: user.email } : null;
}
