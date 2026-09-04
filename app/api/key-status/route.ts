import { NextResponse } from "next/server";

function getServerApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.Gemini?.trim() ||
    process.env.GEMINI?.trim() ||
    undefined
  );
}

export async function GET() {
  const hasServerKey = Boolean(getServerApiKey());

  return NextResponse.json(
    {
      hasServerKey,
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
