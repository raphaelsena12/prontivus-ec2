-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "resetToken" TEXT,
ADD COLUMN "resetTokenExpires" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "usuarios_resetToken_idx" ON "usuarios"("resetToken");
