import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { VerifiedGuard } from '../verification/verified.guard';
import { Post } from './post.entity';
import { Reaction } from '../reactions/reaction.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Reaction, User])],
  controllers: [PostsController],
  providers: [PostsService, VerifiedGuard],
  exports: [PostsService],
})
export class PostsModule {}
