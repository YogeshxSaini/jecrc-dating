-- CreateTable
CREATE TABLE "passes" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "passes_fromUserId_idx" ON "passes"("fromUserId");

-- CreateIndex
CREATE INDEX "passes_toUserId_idx" ON "passes"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "passes_fromUserId_toUserId_key" ON "passes"("fromUserId", "toUserId");

-- AddForeignKey
ALTER TABLE "passes" ADD CONSTRAINT "passes_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passes" ADD CONSTRAINT "passes_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
