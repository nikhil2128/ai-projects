import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  search(@Query('q') query: string) {
    return this.usersService.searchUsers(query ?? '');
  }

  @Get(':username')
  getProfile(
    @Param('username') username: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.usersService.findByUsername(username, req.user.id);
  }
}
