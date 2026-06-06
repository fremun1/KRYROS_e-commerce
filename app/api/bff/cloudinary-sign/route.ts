import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * BFF Cloudinary upload signature endpoint.
 *
 * Computes the Cloudinary upload signature LOCALLY using Node.js crypto
 * (no NestJS backend call needed). The API secret never leaves the server.
 *
 * Reads Cloudinary credentials from Next.js environment variables:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * GET /api/bff/cloudinary-sign?folder=kryros/videos
 */
export async function GET(req: NextRequest) {
  const cloudName  = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey     = process.env.CLOUDINARY_API_KEY;
  const apiSecret  = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        message:
          "Cloudinary credentials not configured. " +
          "Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET " +
          "to your Render environment variables for the Admin Panel service.",
      },
      { status: 503 }
    );
  }

  const folder    = req.nextUrl.searchParams.get("folder") || "kryros/videos";
  const timestamp = Math.round(Date.now() / 1000);

  // Build the params-to-sign string (Cloudinary requires alphabetical key order)
  const paramsToSign: Record<string, string | number> = { folder, timestamp };
  const paramsString = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join("&");

  // SHA-1 hash of "param1=val1&param2=val2" + apiSecret
  const signature = crypto
    .createHash("sha1")
    .update(paramsString + apiSecret)
    .digest("hex");

  return NextResponse.json({
    signature,
    timestamp,
    cloudName,
    apiKey,
    folder,
  });
}
