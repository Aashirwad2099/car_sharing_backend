import type {
  AddVehicleInput,
  EditVehiclePriceInput,
  ToggleVehicleStatusInput,
  GetOwnerVehiclesQuery,
} from "./vehicle.dto.js";
import { VehicleRepository, type VehicleWithImages } from "./vehicle.repository.js";
import { VehicleErrorCode } from "./vehicle.error.js";
import { CloudinaryService } from "../../shared/services/cloudinary.services.js";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from "../../shared/errors/HttpError.js";
import type { VehicleImage, VehicleImageType, VehicleStatus } from "@prisma/client";

const MAX_IMAGES_PER_VEHICLE = 10;

export interface PaginatedVehicles {
  vehicles: VehicleWithImages[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class VehicleService {
  private readonly repo: VehicleRepository;

  constructor() {
    this.repo = new VehicleRepository();
  }

  // ─── Add Vehicle ────────────────────────────────────────

  async addVehicle(userId: string, input: AddVehicleInput): Promise<VehicleWithImages> {
    const ownerProfile = await this.repo.findOwnerProfileByUserId(userId);
    if (!ownerProfile) {
      throw new NotFoundError("Owner profile not found", VehicleErrorCode.OWNER_PROFILE_NOT_FOUND);
    }

    const existing = await this.repo.findVehicleByRcNumber(input.rcNumber);
    if (existing) {
      throw new ConflictError(
        "A vehicle with this RC number already exists",
        VehicleErrorCode.RC_NUMBER_ALREADY_EXISTS
      );
    }

    // Use provided location or fall back to owner profile's business location
    const businessLat = input.businessLat ?? Number(ownerProfile.businessLat);
    const businessLng = input.businessLng ?? Number(ownerProfile.businessLng);

    return this.repo.createVehicle({
      make: input.make,
      model: input.model,
      year: input.year,
      fuelType: input.fuelType,
      transmission: input.transmission,
      rcNumber: input.rcNumber,
      insuranceValidTill: new Date(input.insuranceValidTill),
      pollutionCertValidTill: new Date(input.pollutionCertValidTill),
      regularPricePerDay: input.regularPricePerDay,
      offerPricePerDay: input.offerPricePerDay ?? null,
      regularDistanceLimitKm: input.regularDistanceLimitKm,
      offerDistanceLimitKm: input.offerDistanceLimitKm ?? null,
      extraPricePerKm: input.extraPricePerKm ?? null,
      extraPricePerHour: input.extraPricePerHour ?? null,
      businessLat,
      businessLng,
      owner: { connect: { id: ownerProfile.id } },
    });
  }

  // ─── Edit Price ─────────────────────────────────────────

  async editVehiclePrice(
    userId: string,
    vehicleId: string,
    input: EditVehiclePriceInput
  ): Promise<VehicleWithImages> {
    const vehicle = await this.getVehicleOrThrow(vehicleId, userId);

    if (vehicle.currentlyBooked) {
      throw new BadRequestError(
        "Cannot edit price while vehicle is currently booked",
        VehicleErrorCode.VEHICLE_CURRENTLY_BOOKED
      );
    }

    return this.repo.updateVehiclePrice(vehicleId, {
      ...(input.regularPricePerDay !== undefined && { regularPricePerDay: input.regularPricePerDay }),
      ...(input.offerPricePerDay !== undefined && { offerPricePerDay: input.offerPricePerDay }),
      ...(input.regularDistanceLimitKm !== undefined && { regularDistanceLimitKm: input.regularDistanceLimitKm }),
      ...(input.offerDistanceLimitKm !== undefined && { offerDistanceLimitKm: input.offerDistanceLimitKm }),
      ...(input.extraPricePerKm !== undefined && { extraPricePerKm: input.extraPricePerKm }),
      ...(input.extraPricePerHour !== undefined && { extraPricePerHour: input.extraPricePerHour }),
    });
  }

  // ─── Toggle Status ──────────────────────────────────────

  async toggleVehicleStatus(
    userId: string,
    vehicleId: string,
    input: ToggleVehicleStatusInput
  ): Promise<{ id: string; status: string }> {
    const vehicle = await this.getVehicleOrThrow(vehicleId, userId);

    if (input.status === "INACTIVE" && vehicle.currentlyBooked) {
      throw new BadRequestError(
        "Cannot deactivate a vehicle that is currently booked",
        VehicleErrorCode.VEHICLE_CURRENTLY_BOOKED
      );
    }

    const updated = await this.repo.updateVehicleStatus(vehicleId, input.status as VehicleStatus);
    return { id: updated.id, status: updated.status };
  }

  // ─── Soft Delete ─────────────────────────────────────────

  async deleteVehicle(userId: string, vehicleId: string): Promise<{ message: string }> {
    const vehicle = await this.getVehicleOrThrow(vehicleId, userId);

    if (vehicle.currentlyBooked) {
      throw new BadRequestError(
        "Cannot delete a vehicle that is currently booked. Cancel the booking first.",
        VehicleErrorCode.VEHICLE_CURRENTLY_BOOKED
      );
    }

    await this.repo.softDeleteVehicle(vehicleId);
    return { message: "Vehicle deleted successfully" };
  }

  // ─── Get All Owner Vehicles ──────────────────────────────

  async getOwnerVehicles(userId: string, query: GetOwnerVehiclesQuery): Promise<PaginatedVehicles> {
    const ownerProfile = await this.repo.findOwnerProfileByUserId(userId);
    if (!ownerProfile) {
      throw new NotFoundError("Owner profile not found", VehicleErrorCode.OWNER_PROFILE_NOT_FOUND);
    }

    const { vehicles, total } = await this.repo.getOwnerVehicles(ownerProfile.id, {
      page: query.page,
      limit: query.limit,
      status: query.status as VehicleStatus | undefined,
    });

    return {
      vehicles,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  // ─── Upload Images ──────────────────────────────────────

  async uploadVehicleImages(
    userId: string,
    vehicleId: string,
    files: Express.Multer.File[],
    imageTypes: VehicleImageType[]
  ): Promise<VehicleImage[]> {
    // 1. Verify ownership
    await this.getVehicleOrThrow(vehicleId, userId);

    // 2. Enforce max images limit
    const existingCount = await this.repo.countVehicleImages(vehicleId);
    const totalAfterUpload = existingCount + files.length;

    if (totalAfterUpload > MAX_IMAGES_PER_VEHICLE) {
      throw new BadRequestError(
        `Vehicle can have at most ${MAX_IMAGES_PER_VEHICLE} images. Currently has ${existingCount}, trying to add ${files.length}.`,
        "VEHICLE_IMAGE_LIMIT_EXCEEDED"
      );
    }

    // 3. Upload all files to Cloudinary in parallel
    const uploadResults = await Promise.all(
      files.map((file, index) =>
        CloudinaryService.uploadBuffer(
          file.buffer,
          `car-sharing/vehicles/${vehicleId}`,
        ).then((result) => ({
          result,
          type: imageTypes[index] ?? "FRONT" as VehicleImageType,
        }))
      )
    );

    // 4. Persist image records
    const images = await this.repo.createVehicleImages(
      uploadResults.map(({ result, type }) => ({
        vehicleId,
        imageUrl:          result.secureUrl,
        cloudinaryPublicId: result.publicId,
        type,
      }))
    );

    return images;
  }

  // ─── Delete Image ───────────────────────────────────────

  async deleteVehicleImage(
    userId: string,
    vehicleId: string,
    imageId: string
  ): Promise<{ message: string }> {
    // 1. Verify vehicle ownership
    await this.getVehicleOrThrow(vehicleId, userId);

    // 2. Find image and verify it belongs to this vehicle
    const image = await this.repo.findVehicleImageById(imageId);
    if (!image || image.vehicleId !== vehicleId) {
      throw new NotFoundError("Image not found", "VEHICLE_IMAGE_NOT_FOUND");
    }

    // 3. Delete from Cloudinary first, then DB
    // If Cloudinary fails we don't delete the DB record — avoids orphaned DB rows
    const cloudinaryPublicId = (image as VehicleImage & { cloudinaryPublicId?: string }).cloudinaryPublicId;
    if (cloudinaryPublicId) {
      await CloudinaryService.deleteImage(cloudinaryPublicId);
    }

    await this.repo.deleteVehicleImage(imageId);

    return { message: "Image deleted successfully" };
  }

  // ─── Private Helpers ────────────────────────────────────

  private async getVehicleOrThrow(vehicleId: string, userId: string): Promise<VehicleWithImages> {
    const vehicle = await this.repo.findVehicleByIdRaw(vehicleId);

    if (!vehicle) {
      throw new NotFoundError("Vehicle not found", VehicleErrorCode.VEHICLE_NOT_FOUND);
    }

    const ownerProfile = await this.repo.findOwnerProfileByUserId(userId);
    if (!ownerProfile || vehicle.ownerProfileId !== ownerProfile.id) {
      throw new ForbiddenError(
        "You do not have permission to modify this vehicle",
        VehicleErrorCode.UNAUTHORIZED
      );
    }

    return vehicle;
  }
}