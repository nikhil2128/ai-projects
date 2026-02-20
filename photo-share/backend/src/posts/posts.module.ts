import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post } from './post.entity';
import { Follow } from '../follows/follow.entity';
import { Reaction } from '../reactions/reaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Follow, Reaction])],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
