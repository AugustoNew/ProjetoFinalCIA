ALTER TABLE "User" ADD COLUMN "slug" TEXT;

UPDATE "User"
SET "slug" = 'prestador-' || lower("id")
WHERE "role" = 'PROVIDER';

CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");
