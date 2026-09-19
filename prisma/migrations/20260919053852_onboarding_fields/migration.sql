-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "eventAt" TIMESTAMP(3),
ADD COLUMN     "greeting" TEXT,
ADD COLUMN     "hostName" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'rose';
