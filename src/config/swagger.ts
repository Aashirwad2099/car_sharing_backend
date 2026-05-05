import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesGlob = path.join(__dirname, "../models/**/*.routes.{ts,js}");
console.log("[Swagger] Scanning:", routesGlob);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Car Sharing API",
      version: "1.0.0",
      description: "REST API for Car Sharing platform — rentals, dent/repair auctions, and technician marketplace.",
    },
    servers: [
      { url: `http://localhost:${env.PORT}${env.API_PREFIX}`, description: "Development server" },
      { url: `https://api.carsharing.com${env.API_PREFIX}`, description: "Production server" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        // ─── Shared ──────────────────────────────────────
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Success" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            code: { type: "string" },
          },
        },
        ValidationErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation failed" },
            code: { type: "string", example: "VALIDATION_ERROR" },
            errors: {
              type: "object",
              additionalProperties: { type: "array", items: { type: "string" } },
            },
          },
        },

        // ─── Auth ─────────────────────────────────────────
        InitiateRegisterRequest: {
          type: "object",
          required: ["name", "phone", "roleId"],
          properties: {
            name: { type: "string", example: "Rahul Sharma" },
            phone: { type: "string", example: "+919876543210" },
            roleId: { type: "integer", example: 1 },
          },
        },
        InitiateRegisterResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
            otpExpiresInMinutes: { type: "integer", example: 10 },
            _devOtp: { type: "string", description: "Dev only" },
          },
        },
        ResendOtpRequest: {
          type: "object",
          required: ["phone"],
          properties: { phone: { type: "string", example: "+919876543210" } },
        },
        VerifyOtpRequest: {
          type: "object",
          required: ["phone", "otp"],
          properties: {
            phone: { type: "string", example: "+919876543210" },
            otp: { type: "string", example: "482910" },
          },
        },
        CompleteRegisterRequest: {
          type: "object",
          required: ["phone", "password", "confirmPassword"],
          properties: {
            phone: { type: "string", example: "+919876543210" },
            password: { type: "string", example: "MySecret@123" },
            confirmPassword: { type: "string", example: "MySecret@123" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["phone", "password"],
          properties: {
            phone: { type: "string", example: "+919876543210" },
            password: { type: "string", example: "MySecret@123" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                phone: { type: "string" },
                role: { type: "string" },
                accountStatus: { type: "string" },
              },
            },
            tokens: {
              type: "object",
              properties: {
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
              },
            },
          },
        },
        RefreshTokenRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: { refreshToken: { type: "string" } },
        },
        TokensResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
          },
        },
        ForgotPasswordRequest: {
          type: "object",
          required: ["phone"],
          properties: { phone: { type: "string", example: "+919876543210" } },
        },
        VerifyForgotOtpResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
            resetToken: { type: "string", description: "Short-lived token (15 min)" },
          },
        },
        ResetPasswordRequest: {
          type: "object",
          required: ["phone", "resetToken", "password", "confirmPassword"],
          properties: {
            phone: { type: "string" },
            resetToken: { type: "string" },
            password: { type: "string" },
            confirmPassword: { type: "string" },
          },
        },

        // ─── Vehicle ──────────────────────────────────────
        AddVehicleRequest: {
          type: "object",
          required: [
            "make", "model", "year", "fuelType", "transmission",
            "rcNumber", "insuranceValidTill", "pollutionCertValidTill",
            "regularPricePerDay", "regularDistanceLimitKm",
            "businessLat", "businessLng",
          ],
          properties: {
            make: { type: "string", example: "Maruti" },
            model: { type: "string", example: "Swift" },
            year: { type: "integer", example: 2022 },
            fuelType: { type: "string", enum: ["PETROL", "DIESEL", "EV", "CNG"], example: "PETROL" },
            transmission: { type: "string", enum: ["MANUAL", "AUTO"], example: "MANUAL" },
            rcNumber: { type: "string", example: "PB10AB1234" },
            insuranceValidTill: { type: "string", format: "date-time", example: "2026-12-31T00:00:00Z" },
            pollutionCertValidTill: { type: "string", format: "date-time", example: "2025-12-31T00:00:00Z" },
            regularPricePerDay: { type: "number", example: 1500 },
            offerPricePerDay: { type: "number", example: 1200, nullable: true },
            regularDistanceLimitKm: { type: "integer", example: 200 },
            offerDistanceLimitKm: { type: "integer", example: 250, nullable: true },
            extraPricePerKm: { type: "number", example: 10, nullable: true },
            extraPricePerHour: { type: "number", example: 50, nullable: true },
            businessLat: { type: "number", example: 30.7333 },
            businessLng: { type: "number", example: 76.7794 },
          },
        },
        EditVehiclePriceRequest: {
          type: "object",
          description: "At least one field required. Pass null to remove optional fields.",
          properties: {
            regularPricePerDay: { type: "number", example: 1600 },
            offerPricePerDay: { type: "number", example: 1300, nullable: true },
            regularDistanceLimitKm: { type: "integer", example: 220 },
            offerDistanceLimitKm: { type: "integer", nullable: true },
            extraPricePerKm: { type: "number", nullable: true },
            extraPricePerHour: { type: "number", nullable: true },
          },
        },
        ToggleVehicleStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "INACTIVE" },
          },
        },
        VehicleResponse: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            make: { type: "string" },
            model: { type: "string" },
            year: { type: "integer" },
            fuelType: { type: "string" },
            transmission: { type: "string" },
            rcNumber: { type: "string" },
            regularPricePerDay: { type: "string" },
            offerPricePerDay: { type: "string", nullable: true },
            regularDistanceLimitKm: { type: "integer" },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
            currentlyBooked: { type: "boolean" },
            images: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  imageUrl: { type: "string" },
                  type: { type: "string" },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        PaginatedVehiclesResponse: {
          type: "object",
          properties: {
            vehicles: {
              type: "array",
              items: { $ref: "#/components/schemas/VehicleResponse" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
                totalPages: { type: "integer" },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: [routesGlob],
};

export const swaggerSpec = swaggerJsdoc(options);