/*
  Warnings:

  - You are about to drop the `habit_entries` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `trackingType` to the `habits` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "habit_entries_habitId_date_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "habit_entries";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "activity_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "value" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_entries_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "timer_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "duration" REAL,
    CONSTRAINT "timer_sessions_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_habits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "trackingType" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "target" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_habits" ("color", "createdAt", "icon", "id", "name", "unit") SELECT "color", "createdAt", "icon", "id", "name", "unit" FROM "habits";
DROP TABLE "habits";
ALTER TABLE "new_habits" RENAME TO "habits";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "activity_entries_habitId_date_idx" ON "activity_entries"("habitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "activity_entries_habitId_date_key" ON "activity_entries"("habitId", "date");

-- CreateIndex
CREATE INDEX "timer_sessions_habitId_startedAt_idx" ON "timer_sessions"("habitId", "startedAt");
