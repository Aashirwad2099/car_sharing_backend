import type { Request, Response, NextFunction } from "express";
import { VehicleService } from "./vehicle.service.js";
import { ApiResponse } from "../../shared/utils/response.utils.js";
import type {
  AddVehicleInput,
  EditVehiclePriceInput,
  ToggleVehicleStatusInput,
  GetOwnerVehiclesQuery,
  UploadVehicleImagesInput,
} from "./vehicle.dto.js";
import type { VehicleImageType } from "@prisma/client";
import { BadRequestError } from "../../shared/errors/HttpError.js";

export class VehicleController {
  private readonly vehicleService: VehicleService;

  constructor() {
    this.vehicleService = new VehicleService();
    this.addVehicle          = this.addVehicle.bind(this);
    this.editVehiclePrice    = this.editVehiclePrice.bind(this);
    this.toggleVehicleStatus = this.toggleVehicleStatus.bind(this);
    this.deleteVehicle       = this.deleteVehicle.bind(this);
    this.getOwnerVehicles    = this.getOwnerVehicles.bind(this);
    this.uploadImages        = this.uploadImages.bind(this);
    this.deleteImage         = this.deleteImage.bind(this);
  }

  // POST /vehicles
  async addVehicle(
    req: Request<{}, {}, AddVehicleInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const vehicle = await this.vehicleService.addVehicle(req.user!.id, req.body);
      ApiResponse.created(res, vehicle, "Vehicle added successfully");
    } catch (err) { next(err); }
  }

  // GET /vehicles
  async getOwnerVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ((req as any).parsedQuery ?? req.query) as unknown as GetOwnerVehiclesQuery;
      const result = await this.vehicleService.getOwnerVehicles(req.user!.id, query);
      ApiResponse.success(res, result, "Vehicles fetched successfully");
    } catch (err) { next(err); }
  }

  // PATCH /vehicles/:id/price
  async editVehiclePrice(
    req: Request<{ id: string }, {}, EditVehiclePriceInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const vehicle = await this.vehicleService.editVehiclePrice(
        req.user!.id, req.params.id, req.body
      );
      ApiResponse.success(res, vehicle, "Vehicle price updated successfully");
    } catch (err) { next(err); }
  }

  // PATCH /vehicles/:id/status
  async toggleVehicleStatus(
    req: Request<{ id: string }, {}, ToggleVehicleStatusInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.vehicleService.toggleVehicleStatus(
        req.user!.id, req.params.id, req.body
      );
      const message = result.status === "ACTIVE"
        ? "Vehicle activated successfully"
        : "Vehicle deactivated successfully";
      ApiResponse.success(res, result, message);
    } catch (err) { next(err); }
  }

  // DELETE /vehicles/:id
  async deleteVehicle(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.vehicleService.deleteVehicle(req.user!.id, req.params.id);
      ApiResponse.success(res, result, result.message);
    } catch (err) { next(err); }
  }

  // POST /vehicles/:id/images
  async uploadImages(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new BadRequestError("At least one image file is required", "NO_FILES_PROVIDED");
      }

      // imageTypes comes from validated req.body (multipart field)
      const { imageTypes } = req.body as UploadVehicleImagesInput;

      // Each file must have a corresponding type
      if (imageTypes.length !== files.length) {
        throw new BadRequestError(
          `imageTypes count (${imageTypes.length}) must match files count (${files.length})`,
          "IMAGE_TYPE_MISMATCH"
        );
      }

      const images = await this.vehicleService.uploadVehicleImages(
        req.user!.id,
        req.params.id,
        files,
        imageTypes as VehicleImageType[]
      );

      ApiResponse.created(res, images, `${images.length} image(s) uploaded successfully`);
    } catch (err) { next(err); }
  }

  // DELETE /vehicles/:id/images/:imageId
  async deleteImage(
    req: Request<{ id: string; imageId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.vehicleService.deleteVehicleImage(
        req.user!.id,
        req.params.id,
        req.params.imageId
      );
      ApiResponse.success(res, result, result.message);
    } catch (err) { next(err); }
  }
}