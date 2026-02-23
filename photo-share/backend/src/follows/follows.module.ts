import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';
import { VerifiedGuard } from '../verification/verified.guard';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [FollowsController],
  providers: [FollowsService, VerifiedGuard],
  exports: [FollowsService],
})
export class FollowsModule {}
