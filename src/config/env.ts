import dotenv from "dotenv";
dotenv.config();

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

const isDev = process.env.NODE_ENV !== "production";

export const env = {
  NODE_ENV:          process.env.NODE_ENV || "development",
  PORT:              parseInt(process.env.PORT || "5000", 10),
  API_PREFIX:        process.env.API_PREFIX || "/api/v1",

  DATABASE_URL:      requireEnv("DATABASE_URL"),

  JWT_SECRET:        requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN:    process.env.JWT_EXPIRES_IN || "15m",

  // MSG91 — only required in production
  MSG91_AUTH_KEY:    isDev ? process.env.MSG91_AUTH_KEY || "" : requireEnv("MSG91_AUTH_KEY"),
  MSG91_TEMPLATE_ID: isDev ? process.env.MSG91_TEMPLATE_ID || "" : requireEnv("MSG91_TEMPLATE_ID"),

  // Cloudinary — only required in production
  CLOUDINARY_CLOUD_NAME: isDev ? process.env.CLOUDINARY_CLOUD_NAME || "" : requireEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY:    isDev ? process.env.CLOUDINARY_API_KEY || "" : requireEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: isDev ? process.env.CLOUDINARY_API_SECRET || "" : requireEnv("CLOUDINARY_API_SECRET"),

  isDev,
  isProd: !isDev,
} as const;