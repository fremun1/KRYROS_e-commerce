import { Controller, Get, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('manage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: List all wallets' })
  getWallets() {
    return this.walletService.listWallets();
  }

  @Get('manage/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin: List all recent transactions' })
  getAllTransactions() {
    return this.walletService.listTransactions();
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get current user wallet balance' })
  getMyBalance(@Req() req: Request) {
    const userId = (req as any).user.id;
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get current user wallet transactions' })
  async getMyTransactions(@Req() req: Request) {
    const userId = (req as any).user.id;
    const wallet = await this.walletService.getWallet(userId);
    return this.walletService.getTransactions(wallet.id);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user wallet (owner or admin)' })
  async getWallet(@Param('userId') userId: string, @Req() req: Request) {
    const user = (req as any).user;
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
    if (!isAdmin && user.id !== userId) {
      throw new ForbiddenException('You do not have access to this wallet');
    }
    return this.walletService.getWallet(userId);
  }

  // Security: JwtAuthGuard inherited from class level; added explicitly here
  // to match the pattern of all other admin routes and prevent guard-ordering
  // confusion in future refactors.
  @Get(':walletId/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get wallet transactions by wallet ID (Admin only)' })
  getTransactions(@Param('walletId') walletId: string) {
    return this.walletService.getTransactions(walletId);
  }
}
