import express from "express";
import cors from "cors";
import * as helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import { env } from "./config/env.js";
import { publicRouter } from "./routes/public.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import { getProposalsDirectoryPath } from "./services/proposal.service.js";
import { whatsappRouter } from "./routes/whatsapp.routes.js";
import { invoiceRouter } from "./routes/invoice.routes.js";
import { contractRouter } from "./routes/contract.routes.js";
import { proposalRouter } from "./routes/proposal.routes.js";

type RequestWithRawBody = express.Request & { rawBody?: string };

export const app = express();

app.set("trust proxy", 1);

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
      return callback(new Error("Not allowed by CORS"));
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

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/proposals", proposalRouter);
app.use("/api/proposals", express.static(getProposalsDirectoryPath()));
app.use("/api/invoices/storage", express.static("storage/invoices"));
app.use("/api/contracts/storage", express.static("storage/contracts"));

app.use("/api", publicRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/reviews", reviewRoutes);
app.use("/", invoiceRouter);
app.use("/", contractRouter);

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isDev = process.env.NODE_ENV !== "production";
  res.status(err.status || 500).json({
    error: isDev ? err.message : "An unexpected error occurred",
    ...(isDev && { stack: err.stack })
  });
  console.error("[API Error]", err.message, err.stack);
});
