import { Router } from "express";
import { VehicleController } from "./vehicle.controller.js";
import { validate, validateQuery } from "../../middleware/validate.js";
import { authenticate, authorizeRoles } from "../../middleware/AuthMiddleware.js";
import { upload } from "../../middleware/upload.js";
import {
  AddVehicleDto,
  EditVehiclePriceDto,
  ToggleVehicleStatusDto,
  GetOwnerVehiclesQueryDto,
  UploadVehicleImagesDto,
} from "./vehicle.dto.js";

const router = Router();
const ctrl = new VehicleController();

// All vehicle routes require authentication + owner role
router.use(authenticate, authorizeRoles("Owner"));

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle management for owners
 */

/**
 * @swagger
 * /vehicles/:
 *   post:
 *     summary: Add a new vehicle
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddVehicleRequest'
 *     responses:
 *       201:
 *         description: Vehicle added
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/VehicleResponse'
 *       409:
 *         description: RC number already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post("/", validate(AddVehicleDto), ctrl.addVehicle);

/**
 * @swagger
 * /vehicles/:
 *   get:
 *     summary: Get all vehicles for the logged-in owner
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Vehicles list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PaginatedVehiclesResponse'
 */
router.get("/", validateQuery(GetOwnerVehiclesQueryDto), ctrl.getOwnerVehicles);

/**
 * @swagger
 * /vehicles/{id}/price:
 *   patch:
 *     summary: Edit vehicle pricing
 *     description: Update one or more price fields. Pass null to remove optional fields.
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EditVehiclePriceRequest'
 *     responses:
 *       200:
 *         description: Price updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/VehicleResponse'
 *       400:
 *         description: Vehicle currently booked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/price", validate(EditVehiclePriceDto), ctrl.editVehiclePrice);

/**
 * @swagger
 * /vehicles/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a vehicle
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ToggleVehicleStatusRequest'
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Vehicle currently booked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/status", validate(ToggleVehicleStatusDto), ctrl.toggleVehicleStatus);

/**
 * @swagger
 * /vehicles/{id}:
 *   delete:
 *     summary: Soft delete a vehicle
 *     description: Marks vehicle as INACTIVE. Booking history is preserved.
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Vehicle deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Vehicle currently booked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", ctrl.deleteVehicle);

/**
 * @swagger
 * /vehicles/{id}/images:
 *   post:
 *     summary: Upload images for a vehicle
 *     description: |
 *       Upload up to 5 images per request. Max 10 total images per vehicle.
 *       Each file must have a corresponding entry in `imageTypes`.
 *       Send as `multipart/form-data`.
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *               - imageTypes
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files (JPEG, PNG, WebP, HEIC). Max 5MB each.
 *               imageTypes:
 *                 type: string
 *                 description: 'JSON array of image types matching each file. e.g. ["FRONT","BACK"]'
 *                 example: '["FRONT","BACK"]'
 *           encoding:
 *             images:
 *               contentType: image/jpeg, image/png, image/webp
 *     responses:
 *       201:
 *         description: Images uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/VehicleImageResponse'
 *       400:
 *         description: No files provided, type mismatch, or limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               noFiles:
 *                 value:
 *                   success: false
 *                   message: "At least one image file is required"
 *                   code: "NO_FILES_PROVIDED"
 *               limitExceeded:
 *                 value:
 *                   success: false
 *                   message: "Vehicle can have at most 10 images."
 *                   code: "VEHICLE_IMAGE_LIMIT_EXCEEDED"
 *       403:
 *         description: Not your vehicle
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post(
  "/:id/images",
  upload.array("images", 5),
  validate(UploadVehicleImagesDto),
  ctrl.uploadImages
);

/**
 * @swagger
 * /vehicles/{id}/images/{imageId}:
 *   delete:
 *     summary: Delete a vehicle image
 *     description: Deletes image from Cloudinary and database.
 *     tags: [Vehicles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vehicle ID
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Not your vehicle
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Vehicle or image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id/images/:imageId", ctrl.deleteImage);

export default router;