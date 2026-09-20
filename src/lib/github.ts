import "server-only";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

export type ContributionDay = { date: string; count: number };

type Connection = {
  username: string;
  token: string;
};

/** Load a user's stored connection and decrypt the token in memory only. */
export async function getConnection(userId: string): Promise<Connection | null> {
  const row = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (!row) return null;
  try {
    const token = decrypt({ encryptedToken: row.encryptedToken, iv: row.iv, authTag: row.authTag });
    return { username: row.username, token };
  } catch {
    return null; // wrong key or corrupted row
  }
}

async function graphql(token: string, query: string, variables?: Record<string, unknown>) {
  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "habit-tracker",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const json = (await res.json()) as { data?: unknown; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message || "GITHUB_ERROR");
  return json.data as Record<string, unknown>;
}

/** Validate credentials against GitHub's GraphQL API. Returns the confirmed login. */
export async function validateCredentials(username: string, token: string): Promise<{ login: string } | null> {
  try {
    const data = await graphql(token, `query { viewer { login } }`);
    const login = (data.viewer as { login: string }).login;
    // A classic PAT from a different account still passes viewer check;
    // verify the requested username resolves as a user.
    const user = await graphql(token, `query($login: String!) { user(login: $login) { login } }`, {
      login: username,
    });
    if (!user.user) return null;
    return { login: (user.user as { login: string }).login };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message.includes("Bad credentials"))) {
      return null;
    }
    if (e instanceof Error && e.message.includes("Could not resolve")) return null;
    throw e;
  }
}

/** Fetch the contribution calendar (last 365 days) for the connected user. */
export async function fetchContributions(token: string, username: string): Promise<ContributionDay[]> {
  const data = await graphql(
    token,
    `query($login: String!) {
       user(login: $login) {
         contributionsCollection {
           contributionCalendar {
             weeks {
               contributionDays {
                 date
                 contributionCount
               }
             }
           }
         }
       }
     }`,
    { login: username }
  );

  const collection = (data.user as { contributionsCollection: { contributionCalendar: { weeks: { contributionDays: { date: string; contributionCount: number }[] }[] } } })
    .contributionsCollection.contributionCalendar;

  return collection.weeks.flatMap((w) =>
    w.contributionDays.map((d) => ({ date: d.date.slice(0, 10), count: d.contributionCount }))
  );
}

/** Encrypt + upsert the connection row for a user. */
export async function saveConnection(userId: string, username: string, token: string) {
  const enc = encrypt(token);
  await prisma.gitHubConnection.upsert({
    where: { userId },
    create: { userId, username, ...enc },
    update: { ...enc, username, updatedAt: new Date() },
  });
}

export async function deleteConnection(userId: string) {
  await prisma.gitHubConnection.deleteMany({ where: { userId } });
}
