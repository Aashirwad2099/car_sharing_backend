import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.isDev ? ["query", "info", "warn", "error"] : ["error"],
  });

if (env.isDev) globalForPrisma.prisma = prisma;

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected via Prisma");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log("🔌 Database disconnected");
};