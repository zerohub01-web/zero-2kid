import "express-async-errors";
import express from "express";
import cors from "cors";
import * as helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { publicRouter } from "./routes/public.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import { getProposalsDirectoryPath } from "./services/proposal.service.js";
import { whatsappRouter } from "./routes/whatsapp.routes.js";
import { whatsappWebhookRouter } from "./routes/whatsapp.webhook.js";
import { invoiceRouter } from "./routes/invoice.routes.js";
import { contractRouter } from "./routes/contract.routes.js";
import { proposalRouter } from "./routes/proposal.routes.js";
import { getWhatsAppAutomationStatus } from "./services/whatsapp.service.js";

type RequestWithRawBody = express.Request & { rawBody?: string };

export const app = express();

app.set("trust proxy", 1);

function isDbUnavailableError(error: unknown) {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
  return (
    message.includes("MongooseServerSelectionError") ||
    message.includes("buffering timed out") ||
    message.includes("ECONNREFUSED") ||
    message.includes("MongoServerSelectionError")
  );
}

app.use(helmet.default());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, "");
      const cleanEnvConfig = env.clientOrigin?.replace(/\/$/, "");

      const allowed = new Set([
        cleanEnvConfig,
        "https://zerohub-api.vercel.app",
        "https://zeroops.in",
        "https://www.zeroops.in",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
      ]);

      if (allowed.has(cleanOrigin)) return callback(null, true);

      // Deny unknown origins without throwing a server error.
      return callback(null, false);
    },
    credentials: true
  })
);
app.use(
  express.json({
    limit: "1mb",
    verify(req, _res, buf) {
      (req as RequestWithRawBody).rawBody = buf.toString("utf8");
    }
  })
);
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan("dev"));

app.get("/", (_req, res) =>
  res.json({
    ok: true,
    service: "zero-api",
    version: "1.0.1",
    updateId: "Build 2026.03.08.1519",
    message: "API is running. Connected to Build 2026.03.08.1519"
  })
);

const healthHandler: express.RequestHandler = async (_req, res) => {
  const timestamp = new Date().toISOString();
  let db: "connected" | "disconnected" = "connected";
  let status: "ok" | "degraded" = "ok";
  let dbError: string | undefined;

  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      throw new Error("db-disconnected");
    }

    await mongoose.connection.db.admin().ping();
  } catch (error) {
    db = "disconnected";
    status = "degraded";
    dbError = error instanceof Error ? error.message : "db-unavailable";
  }

  let whatsappStatus: "connected" | "degraded" | "disconnected" = "disconnected";
  let whatsappWarnings: string[] = [];

  try {
    const whatsapp = await getWhatsAppAutomationStatus();
    if (whatsapp.canSend) {
      whatsappStatus = "connected";
    } else if (whatsapp.configured) {
      whatsappStatus = "degraded";
    } else {
      whatsappStatus = "disconnected";
    }
    whatsappWarnings = whatsapp.warnings;
  } catch (error) {
    status = "degraded";
    whatsappStatus = "degraded";
    whatsappWarnings = [
      `WhatsApp status check failed: ${error instanceof Error ? error.message : "unknown-error"}`
    ];
  }

  return res.status(200).json({
    status,
    timestamp,
    db,
    ...(dbError ? { error: dbError } : {}),
    whatsappStatus,
    ...(whatsappWarnings.length ? { whatsappWarnings } : {})
  });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

app.use("/api/proposals", proposalRouter);
app.use("/api/proposals", express.static(getProposalsDirectoryPath()));
app.use("/api/invoices/storage", express.static("storage/invoices"));
app.use("/api/contracts/storage", express.static("storage/contracts"));

app.use("/api", publicRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/", whatsappWebhookRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/reviews", reviewRoutes);
app.use("/", invoiceRouter);
app.use("/", contractRouter);

app.use((err: Error & { status?: number; code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDbUnavailableError(err)) {
    return res.status(503).json({
      code: "db_unavailable",
      error: "Database connection temporarily unavailable. Please try again."
    });
  }

  res.status(err.status || 500).json({
    code: err.code,
    error: isDev ? err.message : "An unexpected error occurred",
    ...(isDev && { stack: err.stack })
  });
  console.error("[API Error]", err.message, err.stack);
});
