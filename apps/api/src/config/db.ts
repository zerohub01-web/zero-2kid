import mongoose from "mongoose";
import { env } from "./env.js";

function shouldTryLocalFallback(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /querySrv|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i.test(message);
}

async function connectWithUri(uri: string, label: string) {
  console.log(`Attempting MongoDB connection (${label})...`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 7000,
    connectTimeoutMS: 7000
  });
  console.log(`MongoDB connected (${label}).`);
}

export async function connectDb() {
  const primaryUri = env.mongoUri;
  const fallbackUri = (process.env.MONGODB_URI_FALLBACK ?? "mongodb://127.0.0.1:27017/zero-os")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  try {
    await connectWithUri(primaryUri, "primary");
    return;
  } catch (primaryError) {
    console.error("Primary MongoDB connection failed:", primaryError);

    const fallbackAllowed =
      process.env.NODE_ENV !== "production" &&
      Boolean(fallbackUri) &&
      fallbackUri !== primaryUri &&
      shouldTryLocalFallback(primaryError);

    if (!fallbackAllowed) {
      throw primaryError;
    }

    try {
      await connectWithUri(fallbackUri, "fallback-local");
      return;
    } catch (fallbackError) {
      console.error("Fallback MongoDB connection failed:", fallbackError);
      throw fallbackError;
    }
  }
}
