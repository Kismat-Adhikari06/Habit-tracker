"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { validateCredentials, saveConnection, deleteConnection, fetchContributions, getConnection } from "@/lib/github";
import { toISODate, utcMidnight } from "@/lib/habits";

export type GitHubStatus = {
  connected: boolean;
  username?: string;
  lastSyncedAt?: string;
};

export async function getGitHubStatus(): Promise<GitHubStatus> {
  const row = await prisma.gitHubConnection.findFirst();
  if (!row) return { connected: false };
  return { connected: true, username: row.username, lastSyncedAt: row.updatedAt.toISOString() };
}

export async function connectGitHubAction(
  username: string,
  token: string
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  try {
    const name = username.trim().replace(/^@/, "");
    if (!name || !token.trim()) {
      return { ok: false, error: "Username and token are required." };
    }

    // 1. Test the credentials against GitHub's GraphQL API
    const valid = await validateCredentials(name, token.trim());
    if (!valid) {
      return { ok: false, error: "Could not connect to GitHub. Check your username and token." };
    }

    // 2. Encrypt and persist — the plaintext token never leaves this server scope
    await saveConnection(valid.login, token.trim());
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, username: valid.login };
  } catch (e) {
    // Never log the token; log only the failure type
    console.error("connectGitHubAction failed:", e instanceof Error ? e.message : "unknown error");
    return { ok: false, error: "Could not reach GitHub. Try again in a moment." };
  }
}

export async function disconnectGitHubAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteConnection();
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("disconnectGitHubAction failed:", e instanceof Error ? e.message : "unknown error");
    return { ok: false, error: "Could not disconnect." };
  }
}

/**
 * Sync the connected user's contribution calendar into the
 * "GitHub Activity" habit's activity entries (last 365 days).
 */
export async function syncGitHubContributionsAction(): Promise<
  { ok: true; synced: number } | { ok: false; error: string }
> {
  try {
    const conn = await getConnection();
    if (!conn) return { ok: false, error: "GitHub is not connected." };

    const days = await fetchContributions(conn.token, conn.username);
    if (days.length === 0) return { ok: true, synced: 0 };

    const habit = await prisma.habit.findFirst({
      where: { name: "GitHub Activity" },
    });
    if (!habit) return { ok: false, error: "No 'GitHub Activity' habit found. Create one first." };

    const lastSync = await prisma.activityEntry.findFirst({
      where: { habitId: habit.id },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    const lastSyncIso = lastSync ? toISODate(lastSync.date) : null;

    // Only write days at or after the last sync to avoid clobbering manual edits
    const cutoff = lastSyncIso ?? "1970-01-01";
    const fresh = days.filter((d) => d.date >= cutoff && d.count > 0);
    if (fresh.length === 0) return { ok: true, synced: 0 };

    await prisma.$transaction(
      fresh.map((d) => {
        const day = utcMidnight(new Date(d.date + "T00:00:00Z"));
        return prisma.activityEntry.upsert({
          where: { habitId_date: { habitId: habit.id, date: day } },
          create: { habitId: habit.id, date: day, value: d.count },
          update: { value: d.count },
        });
      })
    );

    // Record sync time
    await prisma.gitHubConnection.updateMany({ data: { updatedAt: new Date() } });
    revalidatePath("/");
    return { ok: true, synced: fresh.length };
  } catch (e) {
    console.error("syncGitHubContributionsAction failed:", e instanceof Error ? e.message : "unknown error");
    return { ok: false, error: "Could not sync GitHub contributions." };
  }
}
