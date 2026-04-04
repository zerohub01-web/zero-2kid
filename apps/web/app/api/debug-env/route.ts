import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    env_api_base: process.env.NEXT_PUBLIC_API_BASE_URL || "NOT_SET",
    NODE_ENV: process.env.NODE_ENV || "NOT_SET",
    edge_runtime: process.env.NEXT_RUNTIME === "edge" ? "yes" : "no",
    google_client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      ? `${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 12)}...SET`
      : "NOT_SET",
  }, { status: 200 });
}
