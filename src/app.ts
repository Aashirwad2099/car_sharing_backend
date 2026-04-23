import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

const app: Application = express();

// ─── Security & Parsing ───────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: "*", credentials: true })); // tighten in prod
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────
if (env.isDev) app.use(morgan("dev"));

// ─── Health Check ─────────────────────────────────────────────
app.get(`${env.API_PREFIX}/health`, (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy 🚀",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes (add here as you build) ───────────────────────────
// app.use(`${env.API_PREFIX}/auth`, authRouter);
// app.use(`${env.API_PREFIX}/rides`, ridesRouter);

// ─── 404 & Error Handlers ─────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;