import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

let otplibModule: typeof import('otplib') | null = null;

async function loadOtplib(): Promise<typeof import('otplib')> {
  if (!otplibModule) {
    otplibModule = await import('otplib');
  }
  return otplibModule;
}

// ── AES-256-GCM encryption for TOTP secrets ──────────────────────────────────
// TOTP secrets are encrypted at rest using a key derived from TOTP_ENCRYPTION_KEY.
// Without this env var the service will throw at first use — add it to Render/env.
// Generate a key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Encrypted format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
// This format is detectable (contains ':') and distinguishable from base32 TOTP secrets.
// ─────────────────────────────────────────────────────────────────────────────

const CIPHER_ALGORITHM = 'aes-256-gcm';
const SALT = 'kryros-totp-v1';

function getDerivedKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!raw) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY or JWT_SECRET environment variable is not set. ' +
      '2FA secret encryption is required in production. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  // Derive a 32-byte key from the raw env value using scrypt
  return crypto.scryptSync(raw, SALT, 32);
}

function encryptSecret(plaintext: string): string {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 128-bit GCM authentication tag
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(encryptedValue: string): string {
  // Backward-compatibility: if the value does not match the encrypted format,
  // it is a legacy plaintext secret — return it as-is.
  // (base32 alphabet does not include ':', so this check is reliable)
  if (!encryptedValue.includes(':')) {
    return encryptedValue;
  }
  const parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted TOTP secret format');
  }
  const key = getDerivedKey();
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  return decrypted;
}

// ─────────────────────────────────────────────────────────────────────────────

function buildOtpauthUrl(email: string, secret: string): string {
  const issuer = 'KRYROS Admin';
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private hasWarnedAboutFallbackKey = false;

  constructor(private prisma: PrismaService) {}

  private warnIfUsingFallbackKey() {
    if (!this.hasWarnedAboutFallbackKey && !process.env.TOTP_ENCRYPTION_KEY && process.env.JWT_SECRET) {
      this.hasWarnedAboutFallbackKey = true;
      this.logger.warn(
        'TOTP_ENCRYPTION_KEY is not set. Falling back to JWT_SECRET for 2FA secret encryption. ' +
        'Set a dedicated TOTP_ENCRYPTION_KEY in production.',
      );
    }
  }

  async generateSecret(userId: string, email: string): Promise<{ qrCodeUrl: string; secret: string }> {
    this.warnIfUsingFallbackKey();
    const otplib = await loadOtplib();
    const { authenticator } = otplib;
    const secret = authenticator.generateSecret();
    const otpauthUrl = buildOtpauthUrl(email, secret);

    const encryptedSecret = encryptSecret(secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encryptedSecret, twoFactorEnabled: false },
    });

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
    return { qrCodeUrl, secret };
  }

  async enableTwoFactor(userId: string, code: string): Promise<void> {
    this.warnIfUsingFallbackKey();
    const otplib = await loadOtplib();
    const { authenticator } = otplib;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('2FA setup not initiated. Call /auth/2fa/setup first.');
    }
    const plaintextSecret = decryptSecret(user.twoFactorSecret);
    const isValid = authenticator.check(code, plaintextSecret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid authenticator code');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
  }

  async disableTwoFactor(userId: string, code: string): Promise<void> {
    this.warnIfUsingFallbackKey();
    const otplib = await loadOtplib();
    const { authenticator } = otplib;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled on this account');
    }
    const plaintextSecret = decryptSecret(user.twoFactorSecret);
    const isValid = authenticator.check(code, plaintextSecret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid authenticator code');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  }

  async verifyCode(encryptedOrPlainSecret: string, code: string): Promise<boolean> {
    this.warnIfUsingFallbackKey();
    const otplib = await loadOtplib();
    const { authenticator } = otplib;
    const secret = decryptSecret(encryptedOrPlainSecret);
    return authenticator.check(code, secret);
  }
}
