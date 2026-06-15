import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Request,
  Redirect,
  UnauthorizedException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TwoFactorEnableDto, TwoFactorValidateDto } from './dto/two-factor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedRequest {
  user: Pick<JwtPayload, 'sub' | 'email' | 'role'> & { id: string };
  headers: Record<string, string | string[] | undefined>;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
    private prisma: PrismaService,
  ) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user' })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (createUserDto.role && createUserDto.role !== UserRole.CUSTOMER) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException(
          'Authorization required to create privileged accounts',
        );
      }
      const token = (Array.isArray(authHeader) ? authHeader[0] : authHeader).split(' ')[1];
      const payload = await this.authService.validateToken(token);
      if (!payload || payload.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only Super Admins can create privileged accounts');
      }
    }
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Login with email/phone and password' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Rotate refresh token and get a new access token' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  async logout(@Body() body: RefreshTokenDto) {
    if (body.refreshToken) {
      await this.authService.logout(body.refreshToken);
    }
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user' })
  async logoutAll(@Request() req: AuthenticatedRequest) {
    await this.authService.logoutAll(req.user.id);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Request a password reset token' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.forgotPassword(body.identifier);
    return {
      message: 'If an account with that identifier exists, a reset token has been sent.',
    };
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password using a reset token' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body.token, body.newPassword);
  }
  @Get('verify-email')
  @SkipThrottle()
  @ApiOperation({ summary: 'Verify email address via token from verification email' })
  async verifyEmail(@Query('token') token: string) {
    const appUrl = process.env.APP_URL || ''; // Strictly use environment variable in production
    try {
      await this.authService.verifyEmail(token);
      return { verified: true, message: 'Email verified successfully. You can now log in.' };
    } catch {
      return { verified: false, message: 'Invalid or expired verification link.' };
    }
  }


  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async me(@Request() req: AuthenticatedRequest) {
    return req.user;
  }


  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current 2FA status for the logged-in user' })
  async get2faStatus(@Request() req: AuthenticatedRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { twoFactorEnabled: true },
    });
    return { enabled: user?.twoFactorEnabled ?? false };
  }

    // ── 2FA ENDPOINTS ─────────────────────────────────────────────────────────

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Generate a 2FA secret and QR code for the current admin user' })
  async setup2fa(@Request() req: AuthenticatedRequest) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    const email = user.email ?? req.user.sub;
    return this.twoFactorService.generateSecret(req.user.sub, email);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verify TOTP code and permanently enable 2FA on the account' })
  async enable2fa(
    @Request() req: AuthenticatedRequest,
    @Body() body: TwoFactorEnableDto,
  ) {
    await this.twoFactorService.enableTwoFactor(req.user.sub, body.code);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable 2FA — requires current TOTP code to confirm' })
  async disable2fa(
    @Request() req: AuthenticatedRequest,
    @Body() body: TwoFactorEnableDto,
  ) {
    await this.twoFactorService.disableTwoFactor(req.user.sub, body.code);
  }

  @Post('2fa/validate')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Complete 2FA login by submitting the TOTP code and pending token' })
  async validate2fa(@Body() body: TwoFactorValidateDto) {
    let payload: JwtPayload;
    try {
      payload = await this.authService.validateToken(body.twoFactorToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA session. Please log in again.');
    }

    if ((payload as any).type !== '2fa-pending') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA is not configured for this account');
    }

    const isValid = await this.twoFactorService.verifyCode(user.twoFactorSecret, body.code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid authenticator code');
    }

    return this.authService.completeTwoFactorLogin(user);
  }
}
