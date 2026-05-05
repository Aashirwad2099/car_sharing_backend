/*
  Warnings:

  - You are about to drop the column `cloudinary_public_id` on the `vehicles` table. All the data in the column will be lost.
  - Added the required column `cloudinary_public_id` to the `vehicle_images` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "vehicle_images" ADD COLUMN     "cloudinary_public_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "vehicles" DROP COLUMN "cloudinary_public_id";
