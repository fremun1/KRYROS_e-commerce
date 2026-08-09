import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../common/email/email.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { GeolocationService } from '../common/services/geolocation.service';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TTL_MS = 15 * 60 * 1000; // 15 minutes

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private geolocationService: GeolocationService,
  ) {
    // ── Redis health check ────────────────────────────────────────────────────
    // The failed-login lockout counter is stored via cacheManager. If REDIS_URL
    // is not configured, NestJS cache-manager falls back to in-memory storage,
    // which means lockout state resets on every server restart — allowing
    // brute-force attacks to resume immediately after a restart.
    // Set REDIS_URL in your production environment to persist lockout state.
    if (!process.env.REDIS_URL) {
      console.warn(
        '[AuthService] WARNING: REDIS_URL is not set. ' +
        'Login lockout state is stored in memory and will be lost on server restart. ' +
        'Set REDIS_URL in production to persist brute-force protection across restarts.',
      );
    }
  }

  // ── Failed-login lockout (cache-backed, sliding window) ──────────────────
  private lockKey(id: string): string {
    return `login_lock:${id.toLowerCase().trim()}`;
  }

  private async checkLockout(identifier: string): Promise<void> {
    const attempts = (await this.cacheManager.get<number>(this.lockKey(identifier))) ?? 0;
    if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException(
        'Too many failed attempts. Account temporarily locked for 15 minutes.',
      );
    }
  }

  private async recordFailedAttempt(identifier: string): Promise<void> {
    const key = this.lockKey(identifier);
    const attempts = (await this.cacheManager.get<number>(key)) ?? 0;
    await this.cacheManager.set(key, attempts + 1, LOCKOUT_TTL_MS);
  }

  private async clearFailedAttempts(identifier: string): Promise<void> {
    await this.cacheManager.del(this.lockKey(identifier));
  }

  // ── Country Detection Helper ───────────────────────────────────────────────────
  private async resolveCountryCode(request: any, countryCode?: string): Promise<string> {
    // Priority: 1. Explicit country code from request, 2. IP-based detection, 3. Default to 'US'
    if (countryCode) {
      return countryCode.toUpperCase();
    }

    try {
      const clientIp = this.geolocationService.getClientIp(request);
      if (clientIp && clientIp !== 'unknown') {
        const geoData = await this.geolocationService.detectCountryByIp(clientIp);
        if (geoData && geoData.countryCode) {
          return geoData.countryCode;
        }
      }
    } catch (error) {
      console.warn('[AuthService] Geolocation detection failed:', error.message);
    }

    return 'US'; // Default fallback
  }

  private isZambiaCountry(countryCode: string): boolean {
    return countryCode === 'ZM';
  }

  // ── OTP Helper Methods ───────────────────────────────────────────────────────────
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendOtpViaEmail(email: string, otpCode: string): Promise<void> {
    await this.emailService.sendOtp(email, otpCode);
  }

  private async sendOtpViaSms(phone: string, otpCode: string): Promise<void> {
    await this.notificationsService.sendSMS(phone, `Your KRYROS verification code is: ${otpCode}. Valid for 10 minutes.`);
  }

  private normalizeIdentifier(value: string): string {
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes('@')) return trimmed.toLowerCase();

    const normalizedPhone = trimmed.replace(/[^\d+]/g, '');
    if (normalizedPhone.startsWith('+')) {
      return `+${normalizedPhone.slice(1).replace(/\D/g, '')}`;
    }

    return normalizedPhone.replace(/\D/g, '');
  }

  private buildPayload(user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
  }): Omit<JwtPayload, 'iat' | 'exp' | 'type'> {
    return { sub: user.id, email: user.email, phone: user.phone, role: user.role };
  }

  private signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'type'>): string {
    return this.jwtService.sign({ ...payload, type: 'access' }, { expiresIn: '15m' });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const raw = generateOpaqueToken();
    const tokenHash = hashToken(raw);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return raw;
  }

  async validateUser(identifier: string, password: string): Promise<any> {
    const user = await this.usersService.findByIdentifier(identifier);
    if (!user) return null;
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;
    if (!user.isActive) return null;
    const { password: _pw, ...result } = user;
    return result;
  }

  // ── reCAPTCHA v3 verification ─────────────────────────────────────────────
  // Calls Google's siteverify endpoint to check the score (0.0–1.0).
  // Score < 0.5 indicates likely bot. Skip gracefully in dev without secret.
  private async verifyCaptcha(token: string): Promise<void> {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[AuthService] RECAPTCHA_SECRET_KEY not set — skipping CAPTCHA verification in dev');
        return;
      }
      throw new BadRequestException('CAPTCHA configuration error');
    }
    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = (await res.json()) as {
      success: boolean;
      score?: number;
      action?: string;
      'error-codes'?: string[];
    };
    if (!data.success || (data.score !== undefined && data.score < 0.5)) {
      throw new BadRequestException(
        'CAPTCHA verification failed — please refresh the page and try again',
      );
    }
  }

  async login(loginDto: LoginDto) {
    // Verify reCAPTCHA v3 token BEFORE lockout check and any DB work
    // captchaToken is optional during migration — all clients will send it once updated
    if (loginDto.captchaToken) {
      await this.verifyCaptcha(loginDto.captchaToken);
    }

    // Check lockout BEFORE any DB work to stop brute-force early
    await this.checkLockout(loginDto.identifier);

    const user = await this.usersService.findByIdentifier(loginDto.identifier);

    if (!user) {
      // Record attempt even for unknown identifiers (prevents enumeration via timing)
      await this.recordFailedAttempt(loginDto.identifier);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      await this.recordFailedAttempt(loginDto.identifier);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Successful credential check — clear failed attempts + record login time
    await this.clearFailedAttempts(loginDto.identifier);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Notify Admin of User Login (if not an admin logging in)
    if (user.role === 'CUSTOMER') {
      this.notificationsService.sendToAdmins(
        'User Login 🔐',
        `${user.firstName} ${user.lastName} (${user.email || user.phone}) has logged in.`,
        { type: 'USER_LOGIN', userId: user.id, url: `/users?id=${user.id}` }
      ).catch(() => {});
    }

    // Auto-verify users on successful login (no email verification flow exists)
    if (!user.isVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    if ((user as any).twoFactorEnabled) {
      const twoFactorToken = this.jwtService.sign(
        { sub: user.id, type: '2fa-pending' },
        { expiresIn: '5m' },
      );
      return { requiresTwoFactor: true, twoFactorToken };
    }

    const payload = this.buildPayload(user);
    const [accessToken, refreshToken] = await Promise.all([
      Promise.resolve(this.signAccessToken(payload)),
      this.createRefreshToken(user.id),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  }

  async completeTwoFactorLogin(user: { id: string; email: string | null; phone: string | null; role: string; firstName: string; lastName: string; avatar: string | null }) {
    const payload = this.buildPayload(user);
    const [accessToken, refreshToken] = await Promise.all([
      Promise.resolve(this.signAccessToken(payload)),
      this.createRefreshToken(user.id),
    ]);
    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  }

  async register(createUserDto: CreateUserDto) {
    // Verify reCAPTCHA v3 token BEFORE any DB work
    // captchaToken is optional during migration — all clients will send it once updated
    if (createUserDto.captchaToken) {
      await this.verifyCaptcha(createUserDto.captchaToken);
    }

    // Direct registration is now restricted to admin-only use
    // Regular users must use the OTP flow (send-otp -> verify-otp)
    if (!createUserDto.role || createUserDto.role === 'CUSTOMER') {
      throw new BadRequestException('Direct registration is disabled. Please use the OTP verification flow (send-otp -> verify-otp).');
    }

    if (!createUserDto.email && !createUserDto.phone) {
      throw new ConflictException('Either email or phone is required');
    }

    if (createUserDto.email) {
      const existing = await this.usersService.findByEmail(createUserDto.email);
      if (existing) throw new ConflictException('Email already registered');
    }

    if (createUserDto.phone) {
      const existing = await this.usersService.findByPhone(createUserDto.phone);
      if (existing) throw new ConflictException('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, BCRYPT_ROUNDS);

    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
      // isVerified defaults to true in the DB schema — not passed from DTO
    });

    const { password: _pw, ...result } = user;
    const payload = this.buildPayload(result);
    const [accessToken, refreshToken] = await Promise.all([
      Promise.resolve(this.signAccessToken(payload)),
      this.createRefreshToken(result.id),
    ]);

    // Send email verification if user has an email
    if (result.email) {
      const verifyRaw = generateOpaqueToken();
      const verifyHash = hashToken(verifyRaw);
      await this.prisma.user.update({
        where: { id: result.id },
        data: {
          emailVerificationToken: verifyHash,
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });
      await this.emailService.sendEmailVerification(result.email, verifyRaw);
    }

    // Send User Registered Notification (This handles both Admin alert and User welcome)
    this.notificationsService.sendUserRegisteredNotification(result.id)
      .catch(e => console.warn('User registration notification failed:', e?.message));

    return { user: result, accessToken, refreshToken };
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: tokenHash,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
  }

  async refreshToken(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { tokenHash } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(stored.userId);
    if (!user || !user.isActive) {
      await this.prisma.refreshToken.delete({ where: { tokenHash } });
      throw new UnauthorizedException('Account not found or deactivated');
    }

    await this.prisma.refreshToken.delete({ where: { tokenHash } });

    const payload = this.buildPayload(user);
    const [accessToken, newRefreshToken] = await Promise.all([
      Promise.resolve(this.signAccessToken(payload)),
      this.createRefreshToken(user.id),
    ]);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async forgotPassword(identifier: string): Promise<void> {
    const user = await this.usersService.findByIdentifier(identifier);

    if (!user) {
      // Return silently — do not leak whether the account exists
      return;
    }

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: expires,
      },
    });

    // Send reset email (or log in dev if SMTP not configured)
    if (user.email) {
      await this.emailService.sendPasswordReset(user.email, rawToken);
    } else {
      // Phone-only users — log in dev; in prod integrate SMS
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Password reset token for ${identifier}: ${rawToken}`);
      }
    }
  }

  async checkIdentifier(identifier: string): Promise<{ exists: boolean }> {
    const user = await this.usersService.findByIdentifier(identifier);
    return { exists: !!user };
  }

  async sendOtp(
    identifier: string,
    countryCode?: string,
    request?: any,
    extraData?: { email?: string; phone?: string }
  ): Promise<{ success: boolean; message: string; otpChannel: string; destination: string }> {
    const normalizedIdentifier = this.normalizeIdentifier(identifier);
    const isEmail = normalizedIdentifier.includes('@');

    // Check if user already exists
    const existingUser = await this.usersService.findByIdentifier(normalizedIdentifier);
    if (existingUser) {
      throw new ConflictException('An account with this identifier already exists. Please login instead.');
    }

    // Resolve country code
    const resolvedCountryCode = await this.resolveCountryCode(request, countryCode);
    const isZambia = this.isZambiaCountry(resolvedCountryCode);

    // Determine OTP channel based on country and identifier type
    let otpChannel: 'email' | 'sms';
    let destination: string;

    if (isZambia) {
      // Zambia: Always require phone for SMS OTP
      if (isEmail && !extraData?.phone) {
        throw new BadRequestException('For Zambia registration, please provide a phone number for SMS verification.');
      }
      otpChannel = 'sms';
      // If Zambia and identifier is email, destination MUST be the phone number
      destination = !isEmail ? normalizedIdentifier : this.normalizeIdentifier(extraData!.phone!);
    } else {
      // Other countries: Use email OTP
      if (!isEmail && !extraData?.email) {
        throw new BadRequestException('For international registration, please provide an email address for verification.');
      }
      otpChannel = 'email';
      // If international and identifier is phone, destination MUST be the email
      destination = isEmail ? normalizedIdentifier : this.normalizeIdentifier(extraData!.email!);
    }

    // Generate OTP code
    const otpCode = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Determine final email/phone to store
    const finalEmail = isEmail ? normalizedIdentifier : (extraData?.email ? this.normalizeIdentifier(extraData.email) : null);
    const finalPhone = !isEmail ? normalizedIdentifier : (extraData?.phone ? this.normalizeIdentifier(extraData.phone) : null);

    // Clean up any existing pending registration for these identifiers
    await this.prisma.pendingRegistration.deleteMany({
      where: {
        OR: [
          ...(finalEmail ? [{ email: finalEmail }] : []),
          ...(finalPhone ? [{ phone: finalPhone }] : []),
        ],
      },
    });

    // Store pending registration with temporary placeholder data
    await this.prisma.pendingRegistration.create({
      data: {
        email: finalEmail,
        phone: finalPhone,
        password: '', // Will be set in verifyOtp
        firstName: '',
        lastName: '',
        countryCode: resolvedCountryCode,
        otpCode,
        otpChannel,
        expiresAt,
      },
    });

    // Send OTP
    if (otpChannel === 'email') {
      await this.sendOtpViaEmail(destination, otpCode);
    } else {
      await this.sendOtpViaSms(destination, otpCode);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${destination}: ${otpCode}`);
    }

    return {
      success: true,
      message: `OTP sent via ${otpChannel === 'email' ? 'email' : 'SMS'}`,
      otpChannel,
      destination: this.maskIdentifier(destination, otpChannel),
    };
  }

  async verifyOtp(
    identifier: string,
    otpCode: string,
    userData: {
      password: string;
      firstName: string;
      lastName: string;
      dob?: string;
    },
  ): Promise<{ success: boolean; message: string; user?: any; accessToken?: string; refreshToken?: string }> {
    const normalizedIdentifier = this.normalizeIdentifier(identifier);
    const isEmail = normalizedIdentifier.includes('@');

    // Find pending registration
    const pending = await this.prisma.pendingRegistration.findFirst({
      where: {
        AND: [
          { email: isEmail ? normalizedIdentifier : null },
          { phone: !isEmail ? normalizedIdentifier : null },
          { otpCode },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!pending) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    // Check if user already exists (double-check)
    const existingUser = await this.usersService.findByIdentifier(normalizedIdentifier);
    if (existingUser) {
      await this.prisma.pendingRegistration.delete({ where: { id: pending.id } });
      throw new ConflictException('An account with this identifier already exists. Please login instead.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);

    // Create user
    const user = await this.usersService.create({
      email: pending.email,
      phone: pending.phone,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      country: pending.countryCode,
      dob: userData.dob,
    });

    // Delete pending registration
    await this.prisma.pendingRegistration.delete({ where: { id: pending.id } });

    // Generate tokens
    const { password: _pw, ...result } = user;
    const payload = this.buildPayload(result);
    const [accessToken, refreshToken] = await Promise.all([
      Promise.resolve(this.signAccessToken(payload)),
      this.createRefreshToken(result.id),
    ]);

    // Add to SMS contacts if Zambia user
    const isZambia = pending.countryCode === 'ZM' || pending.countryCode?.toLowerCase() === 'zambia';
    if (isZambia && result.phone) {
      this.prisma.smsContact.upsert({
        where: { phone: result.phone },
        update: { name: `${result.firstName} ${result.lastName}`, source: 'Registration' },
        create: { phone: result.phone, name: `${result.firstName} ${result.lastName}`, source: 'Registration' },
      }).catch(() => {});
    }

    // Notify Admin of New User Registration
    this.notificationsService.sendToAdmins(
      'New User Registered! 🆕',
      `${result.firstName} ${result.lastName} (${result.email || result.phone}) just joined KRYROS.`,
      { type: 'USER_REGISTER', userId: result.id, url: `/users?search=${encodeURIComponent(result.email || result.phone || '')}` }
    ).catch(() => {});

    // Send Welcome Notification to New User
    this.notificationsService.sendUserRegisteredNotification(result.id)
      .catch(e => console.warn('User registration notification failed:', e?.message));

    return {
      success: true,
      message: 'Account created successfully',
      user: result,
      accessToken,
      refreshToken,
    };
  }

  private maskIdentifier(identifier: string, channel: 'email' | 'sms'): string {
    if (channel === 'email') {
      const [local, domain] = identifier.split('@');
      const maskedLocal = local.length > 2 
        ? local.substring(0, 2) + '*'.repeat(local.length - 2) 
        : local;
      return `${maskedLocal}@${domain}`;
    } else {
      // Mask phone number (show last 4 digits)
      const cleaned = identifier.replace(/\D/g, '');
      if (cleaned.length <= 4) return identifier;
      return '*'.repeat(cleaned.length - 4) + cleaned.substring(cleaned.length - 4);
    }
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        isVerified: true,
      },
    });

    // Notify User of Password Change
    this.notificationsService.sendToUser(
      user.id,
      'Password Changed 🔐',
      'Your account password has been successfully updated.',
      { type: 'PASSWORD_CHANGED' }
    ).catch(() => {});

    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
