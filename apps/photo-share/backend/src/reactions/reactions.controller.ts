import { Controller, Post, Get, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReactionsService } from './reactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Reactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/posts/:postId/reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  toggle(
    @Param('postId', ParseIntPipe) postId: number,
    @Body('emoji') emoji: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.reactionsService.toggleReaction(req.user.id, postId, emoji);
  }

  @Get()
  getReactions(@Param('postId', ParseIntPipe) postId: number) {
    return this.reactionsService.getPostReactions(postId);
  }
}
