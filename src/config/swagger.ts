import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env.js";
import path from "path";
import { fileURLToPath } from "url";

// __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve routes path from this file's location up to src/modules
const routesGlob = path.join(__dirname, "../models/**/*.routes.{ts,js}");

console.log("[Swagger] Scanning:", routesGlob); // shows exact path being scanned

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Car Sharing API",
      version: "1.0.0",
      description:
        "REST API for Car Sharing platform — rentals, dent/repair auctions, and technician marketplace.",
      contact: {
        name: "API Support",
        email: "support@carsharing.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: "Development server",
      },
      {
        url: `https://api.carsharing.com${env.API_PREFIX}`,
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your access token",
        },
      },
      schemas: {
        // ─── Shared response wrappers ────────────────────
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
            message: { type: "string", example: "Error message" },
            code: { type: "string", example: "AUTH_INVALID_CREDENTIALS" },
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
              additionalProperties: {
                type: "array",
                items: { type: "string" },
              },
              example: {
                phone: ["Enter a valid Indian phone number (+91XXXXXXXXXX)"],
                password: ["Password must be at least 8 characters"],
              },
            },
          },
        },

        // ─── Auth schemas ────────────────────────────────
        InitiateRegisterRequest: {
          type: "object",
          required: ["name", "phone", "roleId"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100, example: "Rahul Sharma" },
            phone: {
              type: "string",
              example: "+919876543210",
              description: "Indian phone number in +91XXXXXXXXXX format",
            },
            roleId: {
              type: "integer",
              example: 1,
              description: "1 = Renter, 2 = Car Rental Company, 3 = Technician",
            },
          },
        },
        InitiateRegisterResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "OTP sent to +919876543210" },
            otpExpiresInMinutes: { type: "integer", example: 10 },
            _devOtp: {
              type: "string",
              example: "482910",
              description: "Only present in development environment",
            },
          },
        },

        VerifyOtpRequest: {
          type: "object",
          required: ["phone", "otp"],
          properties: {
            phone: { type: "string", example: "+919876543210" },
            otp: { type: "string", minLength: 6, maxLength: 6, example: "482910" },
          },
        },

        CompleteRegisterRequest: {
          type: "object",
          required: ["phone", "password", "confirmPassword"],
          properties: {
            phone: { type: "string", example: "+919876543210" },
            password: {
              type: "string",
              minLength: 8,
              example: "MySecret@123",
              description: "Min 8 chars, must include uppercase, lowercase, number, special char",
            },
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
                name: { type: "string", example: "Rahul Sharma" },
                phone: { type: "string", example: "+919876543210" },
                role: { type: "string", example: "renter" },
                accountStatus: { type: "string", example: "ACTIVE" },
              },
            },
            tokens: {
              type: "object",
              properties: {
                accessToken: { type: "string", description: "Short-lived JWT (15 minutes)" },
                refreshToken: { type: "string", description: "Long-lived opaque token (30 days)" },
              },
            },
          },
        },

        RefreshTokenRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string", example: "a3f1c9e2b7d4..." },
          },
        },
        TokensResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },

  apis: [routesGlob],
};

export const swaggerSpec = swaggerJsdoc(options);