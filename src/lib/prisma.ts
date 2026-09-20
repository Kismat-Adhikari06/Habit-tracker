import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Explicit datasource override so the client always resolves dev.db
// relative to the project root, regardless of the server process CWD.
export const pr =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: process.env.DATABASE_URL
      ? { db: { url: process.env.DATABASE_URL } }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = pr;

export const prisma = pr;
