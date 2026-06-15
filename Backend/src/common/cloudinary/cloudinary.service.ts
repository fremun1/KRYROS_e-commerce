import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Allowed MIME types for image uploads (inferred from base64 data URI prefix)
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Max upload size: 10 MB (Cloudinary free plan cap is 10 MB per file) */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Image type presets — controls how Cloudinary crops/resizes on upload.
 *
 * | preset      | use for                                    | behaviour                                    |
 * |-------------|---------------------------------------------|----------------------------------------------|
 * | avatar      | user profile pictures                       | 400×400 smart face-crop, WebP/AVIF delivery  |
 * | product     | product images (any aspect ratio)           | limit to 1200px wide, maintain aspect ratio  |
 * | thumbnail   | category / brand icons, small tiles         | 300×300 fill, smart crop                     |
 * | banner      | CMS banners, hero images, wide artwork      | limit to 1920px wide, maintain aspect ratio  |
 * | generic     | anything else (reviews, misc)               | limit to 1200px, auto quality/format only    |
 */
export type ImagePreset = 'avatar' | 'product' | 'thumbnail' | 'banner' | 'generic';

/** Cloudinary transformation chains per preset */
const PRESET_TRANSFORMATIONS: Record<ImagePreset, object[]> = {
  avatar: [
    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    { quality: 'auto', fetch_format: 'auto' },
  ],
  product: [
    { width: 1200, crop: 'limit' },          // never upscale; shrink if wider than 1200px
    { quality: 'auto', fetch_format: 'auto' },
  ],
  thumbnail: [
    { width: 300, height: 300, crop: 'fill', gravity: 'auto' },
    { quality: 'auto', fetch_format: 'auto' },
  ],
  banner: [
    { width: 1920, crop: 'limit' },          // never upscale; shrink if wider than 1920px
    { quality: 'auto', fetch_format: 'auto' },
  ],
  generic: [
    { width: 1200, crop: 'limit' },
    { quality: 'auto', fetch_format: 'auto' },
  ],
};

/** Derive a sensible default preset from the upload folder path */
function presetFromFolder(folder: string): ImagePreset {
  if (folder.includes('avatar') || folder.includes('user'))    return 'avatar';
  if (folder.includes('product'))                               return 'product';
  if (folder.includes('banner') || folder.includes('hero') ||
      folder.includes('cms') || folder.includes('homepage'))   return 'banner';
  if (folder.includes('category') || folder.includes('brand') ||
      folder.includes('icon') || folder.includes('logo') ||
      folder.includes('thumbnail'))                             return 'thumbnail';
  return 'generic';
}

/** Extract MIME type from a base64 data URI, e.g. data:image/png;base64,... */
function extractMimeType(dataUri: string): string | null {
  const match = dataUri.match(/^data:([a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]+\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]+);base64,/);
  return match ? match[1].toLowerCase() : null;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly configured: boolean;

  constructor(private configService: ConfigService) {
    const cloudName  = configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey     = configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret  = configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
      this.configured = true;
      this.logger.log('Cloudinary configured ✓');
    } else {
      this.configured = false;
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        throw new Error(
          'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set in production. ' +
          'Add these to your Render environment variables.',
        );
      }
      this.logger.warn(
        'Cloudinary credentials not set. Image uploads will fall back to storing base64 in DB (dev only). ' +
        'Add CLOUDINARY_* env vars before going to production.',
      );
    }
  }

  /**
   * Validate and upload a base64 data URI or public URL to Cloudinary.
   *
   * Optimisation applied automatically per image type:
   *   - f_auto  → serves WebP / AVIF to browsers that support them, JPEG/PNG otherwise
   *   - q_auto  → Cloudinary picks the best quality/size balance (typically 60-80% smaller)
   *   - smart crop/resize per preset (avatar=face, product=limit-width, banner=wide, etc.)
   *
   * @param source   Base64 data URI or public HTTPS URL
   * @param folder   Cloudinary folder path  (e.g. "kryros/products")
   * @param publicId Optional Cloudinary public ID (used for deterministic overwrites)
   * @param preset   Override the auto-detected image preset
   */
  async uploadImage(
    source: string,
    folder: string = 'kryros/general',
    publicId?: string,
    preset?: ImagePreset,
  ): Promise<string> {
    // ── Size + MIME validation for base64 uploads ──────────────────────────
    if (CloudinaryService.isBase64(source)) {
      const mimeType = extractMimeType(source);

      if (!mimeType) {
        throw new BadRequestException('Invalid image format: cannot determine MIME type');
      }
      if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
        throw new BadRequestException(
          `Unsupported image type: ${mimeType}. Allowed: jpeg, png, webp, gif`,
        );
      }

      // base64 is ~33% larger than binary — this is a fast pre-check before upload
      const base64Data = source.split(',')[1] || '';
      const approxBytes = (base64Data.length * 3) / 4;
      if (approxBytes > MAX_UPLOAD_BYTES) {
        throw new BadRequestException(
          `Image exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB upload limit`,
        );
      }
    }

    if (!this.configured) {
      this.logger.warn('Cloudinary not configured — storing image as-is (dev only)');
      return source;
    }

    // ── Short-circuit: already a Cloudinary URL — no need to re-upload ──────
    if (typeof source === 'string' && source.includes('res.cloudinary.com')) {
      this.logger.debug(`Image already on Cloudinary — returning as-is`);
      return source;
    }

    // ── Choose the right transformation preset ──────────────────────────────
    const resolvedPreset = preset ?? presetFromFolder(folder);
    const transformation = PRESET_TRANSFORMATIONS[resolvedPreset];

    this.logger.debug(`Uploading to Cloudinary folder="${folder}" preset="${resolvedPreset}"`);

    const options: Record<string, unknown> = {
      folder,
      resource_type: 'image',
      transformation,
    };
    if (publicId) options.public_id = publicId;

    const result: UploadApiResponse = await cloudinary.uploader.upload(source, options);
    this.logger.log(`Uploaded → ${result.public_id} (${result.bytes} bytes, ${result.format})`);
    return result.secure_url;
  }

  /**
   * Validate and upload a video file (base64 data URI or public URL) to Cloudinary.
   *
   * Uses resource_type: 'video' so Cloudinary processes it correctly.
   * Supports: mp4, mov, avi, mkv, webm, m4v, ogv.
   * Max size: 100 MB (Cloudinary free plan limit for video).
   *
   * @param source   Base64 data URI (data:video/mp4;base64,...) or public HTTPS URL
   * @param folder   Cloudinary folder path (e.g. "kryros/videos")
   * @param publicId Optional Cloudinary public ID
   */
  async uploadVideo(
    source: string,
    folder: string = 'kryros/videos',
    publicId?: string,
  ): Promise<string> {
    const ALLOWED_VIDEO_TYPES = new Set([
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm',
      'video/x-m4v',
      'video/ogg',
    ]);

    const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

    if (CloudinaryService.isBase64(source)) {
      const mimeType = extractMimeType(source);
      if (!mimeType) {
        throw new BadRequestException('Invalid video format: cannot determine MIME type');
      }
      if (!ALLOWED_VIDEO_TYPES.has(mimeType)) {
        throw new BadRequestException(
          `Unsupported video type: ${mimeType}. Allowed: mp4, mov, avi, mkv, webm, m4v, ogv`,
        );
      }

      const base64Data = source.split(',')[1] || '';
      const approxBytes = (base64Data.length * 3) / 4;
      if (approxBytes > MAX_VIDEO_BYTES) {
        throw new BadRequestException(
          `Video exceeds the ${MAX_VIDEO_BYTES / (1024 * 1024)} MB upload limit`,
        );
      }
    }

    if (!this.configured) {
      this.logger.warn('Cloudinary not configured — storing video URL as-is (dev only)');
      return source;
    }

    this.logger.debug(`Uploading video to Cloudinary folder="${folder}"`);

    const options: Record<string, unknown> = {
      folder,
      resource_type: 'video',
    };
    if (publicId) options.public_id = publicId;

    const result: UploadApiResponse = await cloudinary.uploader.upload(source, options);
    this.logger.log(`Video uploaded → ${result.public_id} (${result.bytes} bytes, ${result.format})`);
    return result.secure_url;
  }


  /**
   * Generate a signed upload signature for direct browser-to-Cloudinary uploads.
   * The browser uses this to upload files directly to Cloudinary (no server proxy).
   * API secret is NEVER exposed to the client.
   *
   * @param folder  Target Cloudinary folder (default: kryros/videos)
   */
  getUploadSignature(folder: string = 'kryros/videos'): {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
  } {
    if (!this.configured) {
      throw new Error('Cloudinary not configured — add CLOUDINARY_* env vars to Render');
    }
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { timestamp, folder };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      this.configService.get<string>('CLOUDINARY_API_SECRET')!,
    );
    return {
      signature,
      timestamp,
      cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME')!,
      apiKey: this.configService.get<string>('CLOUDINARY_API_KEY')!,
      folder,
    };
  }

  /**
   * Delete a Cloudinary asset by its full secure URL.
   */
  async deleteByUrl(secureUrl: string): Promise<void> {
    if (!this.configured) return;
    try {
      const match = secureUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/);
      if (!match) return;
      await cloudinary.uploader.destroy(match[1]);
      this.logger.log(`Deleted from Cloudinary: ${match[1]}`);
    } catch (err) {
      this.logger.warn(`Failed to delete Cloudinary asset: ${err}`);
    }
  }

  /** Returns true if the string looks like a base64 data URI. */
  static isBase64(str: string): boolean {
    return typeof str === 'string' && str.startsWith('data:');
  }
}
