import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import authRoutes from "./models/auth/auth.routes.js";

const app = express();

// ─── Security Middleware ───────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.isDev ? "*" : process.env.ALLOWED_ORIGINS?.split(",") }));

// ─── Body Parsing ─────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // Prevent payload bombing
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── Health Check ─────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: env.NODE_ENV, timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────
app.use(`${env.API_PREFIX}/auth`, authRoutes);

// ─── 404 + Error Handlers (must be last) ─────────────────
app.use(notFound);
app.use(errorHandler);

export default app;