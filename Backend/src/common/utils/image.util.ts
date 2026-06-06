import * as sharp from 'sharp';

// ── Magic-byte signatures for allowed image types ─────────────────────────────
// These are the first bytes of a valid image file.
// Checking only the data: prefix is not enough — a malicious file could use
// data:image/jpeg but contain a script or binary blob.
const MAGIC_BYTES: Array<{ bytes: number[]; label: string }> = [
  { bytes: [0xff, 0xd8, 0xff],             label: 'JPEG' },
  { bytes: [0x89, 0x50, 0x4e, 0x47],      label: 'PNG'  },
  { bytes: [0x47, 0x49, 0x46],             label: 'GIF'  },
  { bytes: [0x52, 0x49, 0x46, 0x46],      label: 'WEBP' }, // RIFF header (WEBP)
  { bytes: [0x00, 0x00, 0x00],             label: 'AVIF' }, // AVIF/HEIF starts with ftyp box
];

/**
 * Validates that a base64 data-URL contains a legitimate image by checking its
 * magic bytes (binary signature), not just the MIME type string in the prefix.
 * Throws if the data is not a recognised image format.
 */
function validateImageMagicBytes(buffer: Buffer): void {
  const head = Array.from(buffer.slice(0, 8));
  const isValid = MAGIC_BYTES.some(({ bytes }) =>
    bytes.every((byte, idx) => head[idx] === byte)
  );
  if (!isValid) {
    throw new Error('Uploaded file is not a supported image format (JPEG, PNG, GIF, WEBP, AVIF)');
  }
}

export async function compressImage(dataUrl: string, width = 800, height = 800, quality = 70): Promise<string> {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;

    const parts = dataUrl.split(';base64,');
    if (parts.length !== 2) return dataUrl;

    const buffer = Buffer.from(parts[1], 'base64');

    // Security: validate magic bytes before passing to sharp
    validateImageMagicBytes(buffer);

    const compressed = await sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    return `data:image/jpeg;base64,${compressed.toString('base64')}`;
  } catch (err: any) {
    // Re-throw validation errors; swallow processing errors (return original)
    if (err.message?.includes('not a supported image format')) throw err;
    return dataUrl;
  }
}

export async function compressBuffer(
  buffer: Buffer,
  width = 800,
  height = 800,
  quality = 70,
): Promise<{ dataUrl: string }> {
  try {
    // Security: validate magic bytes
    validateImageMagicBytes(buffer);

    const compressed = await sharp(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    return { dataUrl: `data:image/jpeg;base64,${compressed.toString('base64')}` };
  } catch (err: any) {
    if (err.message?.includes('not a supported image format')) throw err;
    return { dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}` };
  }
}
