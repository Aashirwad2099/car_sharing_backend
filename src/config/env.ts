import dotenv from "dotenv";
dotenv.config();

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  API_PREFIX: process.env.API_PREFIX || "/api/v1",
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
} as const;