import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, VerificationStatus } from '../users/user.entity';

/**
 * Blocks restricted/flagged accounts from performing sensitive actions
 * (creating posts, following users). Pending accounts are allowed through
 * to maintain smooth UX — they just haven't been scored yet.
 */
@Injectable()
export class VerifiedGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) return false;

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'verificationStatus'],
    });

    if (!user) return false;

    if (user.verificationStatus === VerificationStatus.RESTRICTED) {
      throw new ForbiddenException(
        'Your account has been restricted. Please complete verification to continue.',
      );
    }

    if (user.verificationStatus === VerificationStatus.FLAGGED) {
      throw new ForbiddenException(
        'Your account is under review. Please verify your email and complete your profile.',
      );
    }

    return true;
  }
}
