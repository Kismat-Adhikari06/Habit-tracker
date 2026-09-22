-- AlterTable
ALTER TABLE "habits" ADD COLUMN "budgetStartedAt" DATETIME;

-- Default state for budget habits: no timer set yet -> hide all data until the
-- user picks their daily budget, so tracking visibly starts when they do.
UPDATE "habits" SET "target" = NULL, "budgetStartedAt" = NULL
WHERE "trackingType" = 'budget';
