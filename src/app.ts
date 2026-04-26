import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import authRoutes from "./models/auth/auth.routes.js";
import { swaggerSpec } from "./config/swagger.js";
import swaggerUi from "swagger-ui-express";


const app = express();

// ─── Security Middleware ───────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.isDev ? "*" : process.env.ALLOWED_ORIGINS?.split(",") }));

// ─── Body Parsing ─────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // Prevent payload bombing
app.use(express.urlencoded({ extended: true, limit: "10kb" }));



if (env.isDev) {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Car Sharing API Docs",
      swaggerOptions: {
        persistAuthorization: true, // keeps Bearer token across page refreshes
        displayRequestDuration: true,
        filter: true,               // adds search bar
        tryItOutEnabled: true,      // "Try it out" open by default
      },
    })
  );
 
  // Also expose raw JSON spec — useful for Postman/Insomnia import
  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
 
  console.log(`📚 Swagger UI: http://localhost:${env.PORT}/api-docs`);
}
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