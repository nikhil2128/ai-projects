import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerifiedGuard } from '../verification/verified.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(VerifiedGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
        caption: { type: 'string' },
        filter: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      // Store in memory buffer for S3 upload + sharp processing
      storage: undefined,
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
          cb(new BadRequestException('Only image files are allowed'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreatePostDto,
    @Request() req: { user: { id: number } },
  ) {
    if (!file) {
      throw new BadRequestException('Image is required');
    }
    return this.postsService.create(req.user.id, dto, file);
  }

  @Get('feed')
  getFeed(
    @Request() req: { user: { id: number } },
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(parseInt(limit), 50) : 20;

    // Support both cursor-based and page-based pagination
    if (cursor) {
      return this.postsService.getFeed(req.user.id, cursor, parsedLimit);
    }
    return this.postsService.getFeedPaginated(
      req.user.id,
      page ? parseInt(page) : 1,
      parsedLimit,
    );
  }

  @Get('user/:username')
  getUserPosts(
    @Param('username') username: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.postsService.getUserPosts(username, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.postsService.findOne(id, req.user.id);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.postsService.deletePost(id, req.user.id);
  }
}
