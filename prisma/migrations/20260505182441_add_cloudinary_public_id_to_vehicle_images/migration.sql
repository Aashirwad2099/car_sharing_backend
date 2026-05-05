-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'PRE_INSPECTION_PENDING', 'PRE_INSPECTION_DONE', 'OWNER_REVIEW_PENDING', 'RIDE_STARTING', 'ACTIVE', 'RIDE_ENDING', 'POST_INSPECTION_PENDING', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ZoneCondition" AS ENUM ('OK', 'MINOR_DENT', 'MAJOR_DENT');

-- CreateEnum
CREATE TYPE "DentSeverity" AS ENUM ('MINOR', 'MAJOR');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'EV', 'CNG');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VehicleImageType" AS ENUM ('FRONT', 'BACK', 'LEFT', 'RIGHT', 'INTERIOR');

-- CreateEnum
CREATE TYPE "FeedbackBy" AS ENUM ('CUSTOMER', 'OWNER');

-- CreateTable
CREATE TABLE "owner_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_lat" DECIMAL(10,7) NOT NULL,
    "business_lng" DECIMAL(10,7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_rides" INTEGER NOT NULL DEFAULT 0,
    "minor_dents" INTEGER NOT NULL DEFAULT 0,
    "major_dents" INTEGER NOT NULL DEFAULT 0,
    "rash_driving_flags" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "owner_profile_id" TEXT NOT NULL,
    "make" VARCHAR(50) NOT NULL,
    "model" VARCHAR(50) NOT NULL,
    "year" INTEGER NOT NULL,
    "fuel_type" "FuelType" NOT NULL,
    "transmission" "Transmission" NOT NULL,
    "rc_number" VARCHAR(20) NOT NULL,
    "insurance_valid_till" TIMESTAMP(3) NOT NULL,
    "pollution_cert_valid_till" TIMESTAMP(3) NOT NULL,
    "cloudinary_public_id" TEXT NOT NULL,
    "regular_price_per_day" DECIMAL(10,2) NOT NULL,
    "offer_price_per_day" DECIMAL(10,2),
    "regular_distance_limit_km" INTEGER NOT NULL,
    "offer_distance_limit_km" INTEGER,
    "business_lat" DECIMAL(10,7) NOT NULL,
    "business_lng" DECIMAL(10,7) NOT NULL,
    "currently_booked" BOOLEAN NOT NULL DEFAULT false,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "total_rentals" INTEGER NOT NULL DEFAULT 0,
    "total_unique_renters" INTEGER NOT NULL DEFAULT 0,
    "extra_price_per_km" DECIMAL(10,2),
    "extra_price_per_hour" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_images" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "type" "VehicleImageType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_zones" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "inspection_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "customer_profile_id" TEXT NOT NULL,
    "owner_profile_id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "start_otp" TEXT,
    "start_otp_expiry" TIMESTAMP(3),
    "end_otp" TEXT,
    "end_otp_expiry" TIMESTAMP(3),
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pre_inspection_submitted_at" TIMESTAMP(3),
    "owner_approved_at" TIMESTAMP(3),
    "start_otp_sent_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "end_otp_sent_at" TIMESTAMP(3),
    "ride_ended_at" TIMESTAMP(3),
    "post_inspection_done_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_ride_inspections" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_by_owner" BOOLEAN NOT NULL DEFAULT false,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "pre_ride_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_ride_inspection_items" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "zone_id" INTEGER NOT NULL,
    "condition" "ZoneCondition" NOT NULL,
    "photo_url" TEXT,

    CONSTRAINT "pre_ride_inspection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_ride_inspections" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "owner_profile_id" TEXT NOT NULL,
    "dent_found" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_ride_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_ride_dent_findings" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "zone_id" INTEGER NOT NULL,
    "severity" "DentSeverity" NOT NULL,

    CONSTRAINT "post_ride_dent_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dent_photos" (
    "id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dent_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_questions" (
    "id" SERIAL NOT NULL,
    "asked_to" "FeedbackBy" NOT NULL,
    "text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "feedback_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_question_options" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "label" VARCHAR(100) NOT NULL,

    CONSTRAINT "feedback_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "submitted_by" "FeedbackBy" NOT NULL,
    "customer_profile_id" TEXT,
    "owner_profile_id" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visible_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_answers" (
    "id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "question_id" INTEGER NOT NULL,
    "option_id" INTEGER,
    "free_text" TEXT,

    CONSTRAINT "feedback_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT,
    "owner_profile_id" TEXT NOT NULL,
    "customer_profile_id" TEXT NOT NULL,
    "duration_sec" INTEGER,
    "called_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_profiles_user_id_key" ON "owner_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_user_id_key" ON "customer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_rc_number_key" ON "vehicles"("rc_number");

-- CreateIndex
CREATE INDEX "vehicles_owner_profile_id_status_idx" ON "vehicles"("owner_profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_zones_name_key" ON "inspection_zones"("name");

-- CreateIndex
CREATE INDEX "bookings_vehicle_id_status_idx" ON "bookings"("vehicle_id", "status");

-- CreateIndex
CREATE INDEX "bookings_customer_profile_id_status_idx" ON "bookings"("customer_profile_id", "status");

-- CreateIndex
CREATE INDEX "bookings_owner_profile_id_status_idx" ON "bookings"("owner_profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pre_ride_inspections_booking_id_key" ON "pre_ride_inspections"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "pre_ride_inspection_items_inspection_id_zone_id_key" ON "pre_ride_inspection_items"("inspection_id", "zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_ride_inspections_booking_id_key" ON "post_ride_inspections"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_booking_id_submitted_by_key" ON "feedbacks"("booking_id", "submitted_by");

-- CreateIndex
CREATE INDEX "call_logs_owner_profile_id_called_at_idx" ON "call_logs"("owner_profile_id", "called_at");

-- CreateIndex
CREATE INDEX "call_logs_customer_profile_id_called_at_idx" ON "call_logs"("customer_profile_id", "called_at");

-- AddForeignKey
ALTER TABLE "owner_profiles" ADD CONSTRAINT "owner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "owner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_profile_id_fkey" FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "owner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_ride_inspections" ADD CONSTRAINT "pre_ride_inspections_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_ride_inspection_items" ADD CONSTRAINT "pre_ride_inspection_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "pre_ride_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_ride_inspection_items" ADD CONSTRAINT "pre_ride_inspection_items_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "inspection_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_ride_inspections" ADD CONSTRAINT "post_ride_inspections_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_ride_inspections" ADD CONSTRAINT "post_ride_inspections_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "owner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_ride_dent_findings" ADD CONSTRAINT "post_ride_dent_findings_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "post_ride_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_ride_dent_findings" ADD CONSTRAINT "post_ride_dent_findings_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "inspection_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dent_photos" ADD CONSTRAINT "dent_photos_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "post_ride_dent_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_question_options" ADD CONSTRAINT "feedback_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "feedback_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_customer_profile_id_fkey" FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "owner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "feedback_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "feedback_question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "owner_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_customer_profile_id_fkey" FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
