import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/bff-utils";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("kryros_refresh")?.value;

  if (refreshToken) {
    fetch(`${getBackendUrl()}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("kryros_token", "", { maxAge: 0, path: "/" });
  res.cookies.set("kryros_refresh", "", { maxAge: 0, path: "/" });
  res.cookies.set("kryros_admin_token", "", { maxAge: 0, path: "/" });
  return res;
}
