import request from "supertest";
import { describe, expect, test } from "vitest";

async function getApp() {
  process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/zero_test";
  process.env.JWT_SECRET ??= "test-secret";
  const { app } = await import("../../src/app.js");
  return app;
}

describe("CORS middleware", () => {
  test("rejects disallowed origins without returning 500", async () => {
    const app = await getApp();
    const response = await request(app)
      .options("/api/contracts")
      .set("Origin", "https://malicious.example")
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBeLessThan(500);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  test("allows known origins and returns CORS headers", async () => {
    const app = await getApp();
    const response = await request(app)
      .options("/api/contracts")
      .set("Origin", "https://zeroops.in")
      .set("Access-Control-Request-Method", "GET");

    expect([200, 204]).toContain(response.status);
    expect(response.headers["access-control-allow-origin"]).toBe("https://zeroops.in");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });
});
