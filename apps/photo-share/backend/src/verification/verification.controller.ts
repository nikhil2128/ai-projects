import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Verification')
@Controller('api/verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiOperation({ summary: 'Get current user verification status and pending actions' })
  getStatus(@Request() req: { user: { id: number } }) {
    return this.verificationService.getVerificationStatus(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('send-verification-email')
  @Throttle({ default: { ttl: 300000, limit: 3 } })
  @ApiOperation({ summary: 'Send email verification link (rate limited: 3 per 5 min)' })
  async sendVerificationEmail(@Request() req: { user: { id: number } }) {
    const token = await this.verificationService.generateEmailVerificationToken(req.user.id);
    // In production, this would send an actual email via SES/SendGrid.
    // For now, return the verification URL for the frontend to display.
    const verifyUrl = `/verify-email?token=${token}`;
    return { message: 'Verification email sent', verifyUrl };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address with token (public endpoint)' })
  async verifyEmail(@Query('token') token: string) {
    return this.verificationService.verifyEmail(token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('recheck')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Request a re-check of verification (after completing profile)' })
  async recheck(@Request() req: { user: { id: number } }) {
    await this.verificationService.rerunVerification(req.user.id);
    return { message: 'Verification re-check queued' };
  }
}
