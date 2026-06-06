import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Exposes a single endpoint that generates a Cloudinary upload signature.
 * The browser uses this signature to upload files DIRECTLY to Cloudinary —
 * large files (videos) never pass through the Next.js or NestJS server.
 *
 * GET /api/cloudinary/sign?folder=kryros/videos
 */
@Controller('api/cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Get('sign')
  @UseGuards(JwtAuthGuard)
  getUploadSignature(@Query('folder') folder?: string) {
    return this.cloudinaryService.getUploadSignature(folder || 'kryros/videos');
  }
}
