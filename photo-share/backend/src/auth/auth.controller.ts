import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

interface RegisterRequest {
  ip?: string;
  headers: {
    'x-forwarded-for'?: string | string[];
    'user-agent'?: string;
  };
}

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  register(@Body() dto: RegisterDto, @Request() req: RegisterRequest) {
    const forwarded = req.headers['x-forwarded-for'];
    const ipFromHeader = Array.isArray(forwarded) ? forwarded[0] : forwarded;

    return this.authService.register(dto, {
      ipAddress: ipFromHeader ?? req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: { user: { id: number } }) {
    return this.authService.getProfile(req.user.id);
  }
}
