import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateLocationDto } from './dto/update-location.dto';

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

  @Get('suggest')
  suggest(@Query('q') query: string) {
    return this.usersService.suggestUsers(query ?? '');
  }

  @Patch('location')
  @ApiOperation({ summary: 'Update current user location for nearby recommendations' })
  updateLocation(
    @Body() dto: UpdateLocationDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.usersService.updateLocation(
      req.user.id,
      dto.latitude,
      dto.longitude,
      dto.locationName,
    );
  }

  @Get(':username')
  getProfile(
    @Param('username') username: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.usersService.findByUsername(username, req.user.id);
  }
}
