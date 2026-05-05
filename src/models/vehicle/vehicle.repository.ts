import {
  type Prisma,
  type Vehicle,
  type VehicleImage,
  type VehicleImageType,
  type VehicleStatus,
} from "@prisma/client";
import { prisma } from "../../config/database.js";

export type VehicleWithImages = Vehicle & { images: VehicleImage[] };

export class VehicleRepository {
  // ─── Owner Profile ─────────────────────────────────────

  async findOwnerProfileByUserId(userId: string) {
    return prisma.ownerProfile.findUnique({ where: { userId } });
  }

  // ─── Vehicle ───────────────────────────────────────────

  async findVehicleByRcNumber(rcNumber: string): Promise<Vehicle | null> {
    return prisma.vehicle.findUnique({ where: { rcNumber } });
  }

  async findVehicleByIdRaw(id: string): Promise<VehicleWithImages | null> {
    return prisma.vehicle.findUnique({
      where: { id },
      include: { images: true },
    });
  }

  async createVehicle(data: Prisma.VehicleCreateInput): Promise<VehicleWithImages> {
    return prisma.vehicle.create({ data, include: { images: true } });
  }

  async updateVehiclePrice(
    id: string,
    data: {
      regularPricePerDay?: number;
      offerPricePerDay?: number | null;
      regularDistanceLimitKm?: number;
      offerDistanceLimitKm?: number | null;
      extraPricePerKm?: number | null;
      extraPricePerHour?: number | null;
    }
  ): Promise<VehicleWithImages> {
    return prisma.vehicle.update({ where: { id }, data, include: { images: true } });
  }

  async updateVehicleStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
    return prisma.vehicle.update({ where: { id }, data: { status } });
  }

  async softDeleteVehicle(id: string): Promise<Vehicle> {
    return prisma.vehicle.update({
      where: { id },
      data: { status: "INACTIVE", currentlyBooked: false },
    });
  }

  async getOwnerVehicles(
    ownerProfileId: string,
    opts: { page: number; limit: number; status?: VehicleStatus }
  ): Promise<{ vehicles: VehicleWithImages[]; total: number }> {
    const where: Prisma.VehicleWhereInput = {
      ownerProfileId,
      ...(opts.status ? { status: opts.status } : {}),
    };

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: { images: true },
        orderBy: { createdAt: "desc" },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      prisma.vehicle.count({ where }),
    ]);

    return { vehicles, total };
  }

  // ─── Vehicle Images ────────────────────────────────────

  async countVehicleImages(vehicleId: string): Promise<number> {
    return prisma.vehicleImage.count({ where: { vehicleId } });
  }

  /**
   * Creates multiple image records in a single transaction.
   * cloudinaryPublicId requires the schema field added via migration.
   */
  async createVehicleImages(
    images: {
      vehicleId: string;
      imageUrl: string;
      type: VehicleImageType;
      cloudinaryPublicId: string;
    }[]
  ): Promise<VehicleImage[]> {
    return prisma.$transaction(
      images.map((img) =>
        prisma.vehicleImage.create({
          data: {
            vehicleId:          img.vehicleId,
            imageUrl:           img.imageUrl,
            type:               img.type,
            cloudinaryPublicId: img.cloudinaryPublicId,
          },
        })
      )
    );
  }

  async findVehicleImageById(imageId: string): Promise<VehicleImage | null> {
    return prisma.vehicleImage.findUnique({ where: { id: imageId } });
  }

  async deleteVehicleImage(imageId: string): Promise<void> {
    await prisma.vehicleImage.delete({ where: { id: imageId } });
  }
}