import { Controller, Post, Delete, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FollowsService } from './follows.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Follows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':username')
  follow(
    @Param('username') username: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.followsService.follow(req.user.id, username);
  }

  @Delete(':username')
  unfollow(
    @Param('username') username: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.followsService.unfollow(req.user.id, username);
  }

  @Get('followers')
  getFollowers(@Request() req: { user: { id: number } }) {
    return this.followsService.getFollowers(req.user.id);
  }

  @Get('following')
  getFollowing(@Request() req: { user: { id: number } }) {
    return this.followsService.getFollowing(req.user.id);
  }
}
