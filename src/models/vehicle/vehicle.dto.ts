import { z } from "zod";

const VEHICLE_IMAGE_TYPES = ["FRONT", "BACK", "LEFT", "RIGHT", "INTERIOR"] as const;

// ─── Add Vehicle ──────────────────────────────────────────

export const AddVehicleDto = z.object({
  make: z
    .string("Make is required" )
    .min(1)
    .max(50)
    .trim(),

  model: z
    .string( "Model is required" )
    .min(1)
    .max(50)
    .trim(),

  year: z
    .number("Year is required" )
    .int()
    .min(2000, "Year must be 2000 or later")
    .max(new Date().getFullYear() + 1, "Invalid year"),

  fuelType: z.enum(["PETROL", "DIESEL", "EV", "CNG"], {
    message: "Fuel type is required",
  }),

  transmission: z.enum(["MANUAL", "AUTO"], {
    message: "Transmission is required",
  }),

  rcNumber: z
    .string( "RC number is required" )
    .min(1)
    .max(20)
    .trim()
    .toUpperCase(),

  insuranceValidTill: z
    .string("Insurance valid till is required" )
    .datetime({ message: "Invalid date format. Use ISO 8601 (e.g. 2026-12-31T00:00:00Z)" }),

  pollutionCertValidTill: z
    .string("Pollution cert valid till is required" )
    .datetime("Invalid date format. Use ISO 8601" ),

  regularPricePerDay: z
    .number("Regular price per day is required" )
    .positive("Price must be positive"),

  offerPricePerDay: z
    .number()
    .positive("Offer price must be positive")
    .optional(),

  regularDistanceLimitKm: z
    .number("Regular distance limit is required" )
    .int()
    .positive("Distance limit must be positive"),

  offerDistanceLimitKm: z
    .number()
    .int()
    .positive("Offer distance limit must be positive")
    .optional(),

  extraPricePerKm: z
    .number()
    .positive("Extra price per km must be positive")
    .optional(),

  extraPricePerHour: z
    .number()
    .positive("Extra price per hour must be positive")
    .optional(),

  businessLat: z
    .number("Business latitude is required" )
    .min(-90)
    .max(90).optional(),

  businessLng: z
    .number("Business longitude is required" )
    .min(-180)
    .max(180).optional(),
});

// ─── Edit Price ───────────────────────────────────────────

export const EditVehiclePriceDto = z.object({
  regularPricePerDay: z
    .number()
    .positive("Price must be positive")
    .optional(),

  offerPricePerDay: z
    .number()
    .positive("Offer price must be positive")
    .nullable()   // allow removing offer price
    .optional(),

  regularDistanceLimitKm: z
    .number()
    .int()
    .positive("Distance limit must be positive")
    .optional(),

  offerDistanceLimitKm: z
    .number()
    .int()
    .positive("Offer distance limit must be positive")
    .nullable()
    .optional(),

  extraPricePerKm: z
    .number()
    .positive()
    .nullable()
    .optional(),

  extraPricePerHour: z
    .number()
    .positive()
    .nullable()
    .optional(),
}).refine(
  (d) =>
    d.regularPricePerDay !== undefined ||
    d.offerPricePerDay !== undefined ||
    d.regularDistanceLimitKm !== undefined ||
    d.offerDistanceLimitKm !== undefined ||
    d.extraPricePerKm !== undefined ||
    d.extraPricePerHour !== undefined,
  { message: "At least one price field must be provided" }
);

// ─── Toggle Status ────────────────────────────────────────

export const ToggleVehicleStatusDto = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"], {
    message: "Status is required",
  }),
});

// ─── Get All Vehicles Query ───────────────────────────────

export const GetOwnerVehiclesQueryDto = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive()),

  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(50)),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const UploadVehicleImagesDto = z.object({
  // imageTypes comes as JSON string from multipart form
  // e.g. '["FRONT","BACK"]'
  imageTypes: z
    .string("imageTypes is required" )
    .transform((val, ctx) => {
      try {
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed)) {
          ctx.addIssue({ code: "custom", message: "imageTypes must be a JSON array" });
          return z.NEVER;
        }
        return parsed as string[];
      } catch {
        ctx.addIssue({ code: "custom", message: "imageTypes must be valid JSON array" });
        return z.NEVER;
      }
    })
    .pipe(
      z
        .array(z.enum(VEHICLE_IMAGE_TYPES, { message: "Invalid image type" }))
        .min(1, "At least one image type is required")
    ),
});

// ─── Inferred Types ───────────────────────────────────────

export type AddVehicleInput          = z.infer<typeof AddVehicleDto>;
export type EditVehiclePriceInput    = z.infer<typeof EditVehiclePriceDto>;
export type ToggleVehicleStatusInput = z.infer<typeof ToggleVehicleStatusDto>;
export type UploadVehicleImagesInput = z.infer<typeof UploadVehicleImagesDto>;
export type GetOwnerVehiclesQuery    = z.infer<typeof GetOwnerVehiclesQueryDto>;