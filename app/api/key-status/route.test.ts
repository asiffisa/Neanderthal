import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

it("returns false when no server key is configured", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("Gemini", "");
  vi.stubEnv("GEMINI", "");

  const res = await GET();
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.hasServerKey).toBe(false);
  expect(data).not.toHaveProperty("apiKey");
});

it("returns true when GEMINI_API_KEY is configured", async () => {
  vi.stubEnv("GEMINI_API_KEY", "secret-test-key");

  const res = await GET();
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.hasServerKey).toBe(true);
  expect(JSON.stringify(data)).not.toContain("secret-test-key");
});

it("returns true when Gemini is configured (user Vercel config)", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("Gemini", "secret-test-key-2");

  const res = await GET();
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.hasServerKey).toBe(true);
  expect(JSON.stringify(data)).not.toContain("secret-test-key-2");
});

it("returns gemini-3.5-flash-lite as the default model", async () => {
  const res = await GET();
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.model).toBe("gemini-3.5-flash-lite");
});

it("respects GEMINI_MODEL env variable override", async () => {
  vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");

  const res = await GET();
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.model).toBe("gemini-3.8-flash");
});
