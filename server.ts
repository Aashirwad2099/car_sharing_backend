import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDB, disconnectDB } from "./src/config/database.js";

async function bootstrap(): Promise<void> {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(
      `🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`
    );
  });

  // ─── Graceful Shutdown ──────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.log("✅ Server closed");
      process.exit(0);
    });

    // Force shutdown after 10s if server doesn't close
    setTimeout(() => {
      console.error("⚠️  Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Unhandled promise rejections — log and exit
  process.on("unhandledRejection", (reason) => {
    console.error("💥 Unhandled Rejection:", reason);
    shutdown("unhandledRejection").catch(() => process.exit(1));
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});