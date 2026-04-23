import app from "./src/app.js";
import { env }  from "./src/config/env.js";

import { connectDB, disconnectDB } from "./src/config/database.js"

const startServer = async (): Promise<void> => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server running in ${env.NODE_ENV} mode`);
    console.log(`📡 Listening on http://localhost:${env.PORT}`);
    console.log(`🔗 Health: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.log("✅ Server closed cleanly");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // ─── Unhandled Errors ───────────────────────────────────────
  process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Rejection:", reason);
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
    process.exit(1);
  });
};

startServer();