import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, isProd } from "@/lib/bff-utils";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
             request.headers.get("x-real-ip") ||
             "unknown";

  try {
    const upstream = await fetch(`${getBackendUrl()}/api/auth/check-region`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip }),
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: "Backend unavailable" }, { status: 503 });
  }
}