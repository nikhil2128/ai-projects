import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VerificationService } from './verification.service';

@Processor('profile-verification')
export class VerificationProcessor extends WorkerHost {
  private readonly logger = new Logger(VerificationProcessor.name);

  constructor(private readonly verificationService: VerificationService) {
    super();
  }

  async process(job: Job<{ userId: number }>): Promise<void> {
    const { userId } = job.data;
    this.logger.log(`Processing verification for user ${userId} (attempt ${job.attemptsMade + 1})`);

    try {
      const report = await this.verificationService.runFullVerification(userId);
      this.logger.log(
        `Verification complete for user ${userId}: score=${report.totalScore}, status=${report.status}`,
      );
    } catch (error) {
      this.logger.error(`Verification failed for user ${userId}`, error);
      throw error;
    }
  }
}
