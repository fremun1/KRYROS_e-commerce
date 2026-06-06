import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/bff-utils";

/**
 * GET /api/bff/me
 *
 * Server-side session validation endpoint used by the admin panel on every
 * page load. Forwards the httpOnly access cookie to the backend /api/auth/me
 * endpoint to verify the token is valid and return fresh user data.
 *
 * This prevents the admin UI from relying solely on localStorage for auth state
 * (which can be tampered with via devtools).
 */
export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get("kryros_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ authenticated: false, reason: "no_token" }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${getBackendUrl()}/api/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!upstream.ok) {
      // Token expired or invalid — client should redirect to login
      return NextResponse.json(
        { authenticated: false, reason: "token_invalid" },
        { status: 401 }
      );
    }

    const user = await upstream.json();
    return NextResponse.json({ authenticated: true, user });

  } catch {
    return NextResponse.json(
      { authenticated: false, reason: "backend_unavailable" },
      { status: 503 }
    );
  }
}
