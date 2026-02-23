import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomBytes } from 'crypto';
import { User, VerificationStatus } from '../users/user.entity';
import { CacheService } from '../cache/cache.service';

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'trashmail.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com',
  'tempail.com', 'tempr.email', 'temp-mail.org', 'emailondeck.com',
  'mohmal.com', 'getnada.com', 'burnermail.io', 'inboxbear.com',
  '10minutemail.com', 'minutemail.com', 'mailnesia.com', 'mytemp.email',
  'disposableemailaddresses.emailmiser.com', 'harakirimail.com',
]);

const BOT_USERNAME_PATTERNS = [
  /^[a-z]{2,3}\d{6,}$/i,              // ab123456
  /^user\d{5,}$/i,                     // user12345
  /^[a-z]{1}\d{8,}$/i,                // a12345678
  /^[a-z0-9]{20,}$/i,                 // random long alphanumeric
  /^(.)\1{4,}/,                        // repeating chars: aaaaabc
  /^test\d*$/i,                        // test, test123
  /^bot[_\-]?\d*/i,                    // bot, bot_123
  /^fake[_\-]?\d*/i,                   // fake, fake_123
  /^spam[_\-]?\d*/i,                   // spam, spam_123
  /^\d{6,}$/,                          // purely numeric 6+ digits
  /^[a-z]{1,2}[_\-][a-z]{1,2}\d{4,}$/i, // a_b1234
];

interface VerificationCheckResult {
  score: number;
  passed: boolean;
  detail: string;
}

export interface VerificationReport {
  totalScore: number;
  status: VerificationStatus;
  checks: Record<string, VerificationCheckResult>;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectQueue('profile-verification')
    private readonly verificationQueue: Queue,
    private readonly cacheService: CacheService,
  ) {}

  async enqueueVerification(userId: number): Promise<void> {
    await this.verificationQueue.add(
      'screen-profile',
      { userId },
      {
        delay: 2000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
    this.logger.log(`Enqueued verification for user ${userId}`);
  }

  async runFullVerification(userId: number): Promise<VerificationReport> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id', 'username', 'email', 'displayName', 'bio', 'avatarUrl',
        'createdAt', 'emailVerified', 'verificationStatus',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const checks: Record<string, VerificationCheckResult> = {};

    checks.emailDomain = this.checkEmailDomain(user.email);
    checks.usernameQuality = this.checkUsernameQuality(user.username);
    checks.profileCompleteness = this.checkProfileCompleteness(user);
    checks.emailVerified = this.checkEmailVerified(user.emailVerified);
    checks.accountAge = this.checkAccountAge(user.createdAt);

    const totalScore = Object.values(checks).reduce((sum, c) => sum + c.score, 0);
    const clampedScore = Math.min(100, Math.max(0, totalScore));

    let status: VerificationStatus;
    if (clampedScore >= 60) {
      status = VerificationStatus.VERIFIED;
    } else if (clampedScore < 30) {
      status = VerificationStatus.FLAGGED;
    } else {
      status = VerificationStatus.PENDING;
    }

    await this.userRepository.update(userId, {
      verificationScore: clampedScore,
      verificationChecks: checks,
      verificationStatus: status,
      verifiedAt: status === VerificationStatus.VERIFIED ? new Date() : null,
    });

    await this.cacheService.invalidateUserProfile(user.username);

    this.logger.log(
      `Verification for user ${user.username}: score=${clampedScore}, status=${status}`,
    );

    return { totalScore: clampedScore, status, checks };
  }

  async rerunVerification(userId: number): Promise<void> {
    await this.verificationQueue.add(
      'screen-profile',
      { userId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async generateEmailVerificationToken(userId: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.userRepository.update(userId, {
      emailVerificationToken: token,
      emailVerificationExpiry: expiry,
    });

    return token;
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.emailVerificationToken')
      .where('user.emailVerificationToken = :token', { token })
      .getOne();

    if (!user) {
      return { success: false, message: 'Invalid verification token' };
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      return { success: false, message: 'Verification token has expired' };
    }

    await this.userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    });

    await this.rerunVerification(user.id);

    return { success: true, message: 'Email verified successfully' };
  }

  async getVerificationStatus(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id', 'verificationStatus', 'verificationScore', 'emailVerified',
        'verificationChecks', 'verifiedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const pendingActions = this.getPendingActions(user);

    return {
      status: user.verificationStatus,
      score: user.verificationScore,
      emailVerified: user.emailVerified,
      verifiedAt: user.verifiedAt,
      checks: user.verificationChecks,
      pendingActions,
    };
  }

  private getPendingActions(user: User): string[] {
    const actions: string[] = [];
    if (!user.emailVerified) actions.push('verify_email');
    const checks = user.verificationChecks;
    if (checks) {
      if (!checks.profileCompleteness?.passed) actions.push('complete_profile');
    } else {
      actions.push('complete_profile');
    }
    return actions;
  }

  private checkEmailDomain(email: string): VerificationCheckResult {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return { score: 0, passed: false, detail: 'Invalid email format' };
    }

    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return { score: 0, passed: false, detail: 'Disposable email domain detected' };
    }

    const trustedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
      'icloud.com', 'protonmail.com', 'proton.me', 'aol.com', 'live.com',
      'me.com', 'mac.com', 'msn.com'];
    if (trustedDomains.includes(domain) || domain.endsWith('.edu') || domain.endsWith('.gov')) {
      return { score: 15, passed: true, detail: 'Trusted email domain' };
    }

    return { score: 10, passed: true, detail: 'Standard email domain' };
  }

  private checkUsernameQuality(username: string): VerificationCheckResult {
    for (const pattern of BOT_USERNAME_PATTERNS) {
      if (pattern.test(username)) {
        return { score: 0, passed: false, detail: 'Username matches suspicious pattern' };
      }
    }

    const hasLetters = /[a-zA-Z]/.test(username);
    const hasReasonableLength = username.length >= 3 && username.length <= 20;
    const digitRatio = (username.match(/\d/g)?.length ?? 0) / username.length;

    if (!hasLetters || !hasReasonableLength) {
      return { score: 5, passed: false, detail: 'Username quality is low' };
    }

    if (digitRatio > 0.5) {
      return { score: 8, passed: false, detail: 'Username has high digit ratio' };
    }

    return { score: 15, passed: true, detail: 'Username appears legitimate' };
  }

  private checkProfileCompleteness(user: User): VerificationCheckResult {
    let completeness = 0;
    const fields = { displayName: 5, bio: 8, avatarUrl: 7 };

    if (user.displayName) completeness += fields.displayName;
    if (user.bio) completeness += fields.bio;
    if (user.avatarUrl) completeness += fields.avatarUrl;

    const maxScore = 20;
    const score = Math.min(maxScore, completeness);
    const passed = score >= 12;

    return {
      score,
      passed,
      detail: passed ? 'Profile is well-filled' : 'Profile needs more details',
    };
  }

  private checkEmailVerified(emailVerified: boolean): VerificationCheckResult {
    return emailVerified
      ? { score: 30, passed: true, detail: 'Email address verified' }
      : { score: 0, passed: false, detail: 'Email not yet verified' };
  }

  private checkAccountAge(createdAt: Date): VerificationCheckResult {
    const ageMs = Date.now() - createdAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours >= 24) {
      return { score: 10, passed: true, detail: 'Account older than 24 hours' };
    }

    if (ageHours >= 1) {
      return { score: 5, passed: false, detail: 'Account is relatively new' };
    }

    return { score: 2, passed: false, detail: 'Account was just created' };
  }
}
