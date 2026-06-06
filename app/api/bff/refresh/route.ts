import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, isProd } from "@/lib/bff-utils";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("kryros_refresh")?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: "No refresh token" }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${getBackendUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!upstream.ok) {
      const res = NextResponse.json({ message: "Session expired" }, { status: 401 });
      res.cookies.set("kryros_token", "", { maxAge: 0, path: "/" });
      res.cookies.set("kryros_refresh", "", { maxAge: 0, path: "/" });
      return res;
    }

    const { accessToken, refreshToken: newRefreshToken } = await upstream.json();
    const res = NextResponse.json({ success: true });
    res.cookies.set("kryros_token", accessToken, {
      httpOnly: true, secure: isProd, sameSite: "strict", maxAge: 15 * 60, path: "/",
    });
    if (newRefreshToken) {
      res.cookies.set("kryros_refresh", newRefreshToken, {
        httpOnly: true, secure: isProd, sameSite: "strict", maxAge: 7 * 24 * 60 * 60, path: "/",
      });
    }
    return res;

  } catch {
    return NextResponse.json({ message: "Refresh failed" }, { status: 500 });
  }
}
