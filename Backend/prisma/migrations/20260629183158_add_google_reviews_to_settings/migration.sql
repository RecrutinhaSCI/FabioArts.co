-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "googleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "googleRatingManual" DOUBLE PRECISION,
ADD COLUMN     "googleReviewUrl" TEXT,
ADD COLUMN     "googleReviewsCount" INTEGER;
