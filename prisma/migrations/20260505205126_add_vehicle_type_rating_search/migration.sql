-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'BIKE');

-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN     "rating" INTEGER;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN     "search_vector" tsvector,
ADD COLUMN     "total_ratings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vehicle_type" "VehicleType" NOT NULL DEFAULT 'CAR';

-- CreateIndex
CREATE INDEX "vehicles_status_vehicle_type_idx" ON "vehicles"("status", "vehicle_type");

-- CreateIndex
CREATE INDEX "vehicles_average_rating_idx" ON "vehicles"("average_rating");
