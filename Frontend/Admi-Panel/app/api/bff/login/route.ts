import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl, isProd } from "@/lib/bff-utils";

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Bad request" }, { status: 400 }); }

  try {
    const upstream = await fetch(`${getBackendUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }

    // 2FA required — pass through without setting cookies yet
    if (data.requiresTwoFactor && data.twoFactorToken) {
      return NextResponse.json({ requiresTwoFactor: true, twoFactorToken: data.twoFactorToken });
    }

    const { accessToken, refreshToken, user } = data;
    if (!accessToken) {
      return NextResponse.json({ message: "Authentication failed" }, { status: 401 });
    }

    const res = NextResponse.json({ success: true, user: user ?? null });
    res.cookies.set("kryros_token", accessToken, {
      httpOnly: true, secure: isProd, sameSite: "strict", maxAge: 15 * 60, path: "/",
    });
    if (refreshToken) {
      res.cookies.set("kryros_refresh", refreshToken, {
        httpOnly: true, secure: isProd, sameSite: "strict", maxAge: 7 * 24 * 60 * 60, path: "/",
      });
    }
    res.cookies.set("kryros_admin_token", "", { maxAge: 0, path: "/" });
    return res;

  } catch {
    return NextResponse.json({ message: "Backend unavailable" }, { status: 503 });
  }
}
