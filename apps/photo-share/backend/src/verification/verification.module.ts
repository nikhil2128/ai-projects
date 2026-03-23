import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { User } from '../users/user.entity';
import { VerificationService } from './verification.service';
import { VerificationProcessor } from './verification.processor';
import { VerificationController } from './verification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    BullModule.registerQueue({ name: 'profile-verification' }),
  ],
  controllers: [VerificationController],
  providers: [VerificationService, VerificationProcessor],
  exports: [VerificationService],
})
export class VerificationModule {}
