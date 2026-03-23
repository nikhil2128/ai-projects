import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('nearby')
  @ApiOperation({
    summary: 'Get nearby users to follow',
    description:
      'Returns users within the specified radius, ranked by proximity and mutual connections. Users not yet followed appear first.',
  })
  @ApiQuery({ name: 'radius', required: false, description: 'Search radius in km (default 50)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Results per page (default 20)' })
  getNearbyUsers(
    @Request() req: { user: { id: number } },
    @Query('radius') radius?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.getNearbyUsers(
      req.user.id,
      radius ? Number(radius) : 50,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }
}
