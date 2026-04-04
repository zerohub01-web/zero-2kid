import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_API_BASE_URL || 'NONE',
    node_env: process.env.NODE_ENV
  });
}
