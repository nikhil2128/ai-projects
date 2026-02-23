import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { ProfileVerificationStatus } from '../users/profile-verification-status.enum';

const DEFAULT_DISPOSABLE_DOMAINS = [
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'temp-mail.org',
  'yopmail.com',
  'sharklasers.com',
  'getnada.com',
];

export interface RegistrationScreeningInput {
  username: string;
  email: string;
  displayName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RegistrationScreeningResult {
  score: number;
  status: ProfileVerificationStatus;
  reasons: string[];
  isRejected: boolean;
}

@Injectable()
export class ProfileScreeningService {
  private readonly logger = new Logger(ProfileScreeningService.name);
  private readonly reviewThreshold: number;
  private readonly rejectThreshold: number;
  private readonly disposableDomains: Set<string>;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.reviewThreshold = Number(
      this.configService.get<string>('PROFILE_SCREEN_REVIEW_THRESHOLD') ?? '40',
    );
    this.rejectThreshold = Number(
      this.configService.get<string>('PROFILE_SCREEN_REJECT_THRESHOLD') ?? '70',
    );

    const configuredDomains = this.configService
      .get<string>('DISPOSABLE_EMAIL_DOMAINS')
      ?.split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);

    this.disposableDomains = new Set(
      configuredDomains && configuredDomains.length > 0
        ? configuredDomains
        : DEFAULT_DISPOSABLE_DOMAINS,
    );
  }

  async screenNewProfile(
    input: RegistrationScreeningInput,
  ): Promise<RegistrationScreeningResult> {
    let score = 0;
    const reasons: string[] = [];

    score += this.scoreUsername(input.username, reasons);
    score += this.scoreEmail(input.email, reasons);
    score += this.scoreDisplayName(input.displayName, reasons);
    score += this.scoreUserAgent(input.userAgent, reasons);
    score += await this.scoreIpVelocity(input.ipAddress, reasons);

    const boundedScore = Math.min(Math.max(score, 0), 100);

    if (boundedScore >= this.rejectThreshold) {
      return {
        score: boundedScore,
        status: ProfileVerificationStatus.PENDING_REVIEW,
        reasons,
        isRejected: true,
      };
    }

    if (boundedScore >= this.reviewThreshold) {
      return {
        score: boundedScore,
        status: ProfileVerificationStatus.PENDING_REVIEW,
        reasons,
        isRejected: false,
      };
    }

    return {
      score: boundedScore,
      status: ProfileVerificationStatus.VERIFIED,
      reasons,
      isRejected: false,
    };
  }

  private scoreUsername(username: string, reasons: string[]): number {
    const value = username.trim().toLowerCase();
    let score = 0;

    if (/\d{5,}/.test(value)) {
      score += 12;
      reasons.push('username has long numeric sequence');
    }

    if (/(.)\1{4,}/.test(value)) {
      score += 14;
      reasons.push('username has repeated characters');
    }

    if (/(free|crypto|airdrop|casino|loan|promo|officialsupport|f4f)/.test(value)) {
      score += 18;
      reasons.push('username contains spam keywords');
    }

    const nonAlphaNumeric = value.replace(/[a-z0-9]/g, '').length;
    const symbolRatio = value.length > 0 ? nonAlphaNumeric / value.length : 0;
    if (symbolRatio > 0.3) {
      score += 10;
      reasons.push('username has too many symbols');
    }

    const digitCount = value.replace(/[^0-9]/g, '').length;
    if (value.length >= 16 && digitCount >= 6) {
      score += 8;
      reasons.push('username pattern looks auto-generated');
    }

    return score;
  }

  private scoreEmail(email: string, reasons: string[]): number {
    const value = email.trim().toLowerCase();
    let score = 0;

    const [localPart = '', domain = ''] = value.split('@');

    if (!localPart || !domain) {
      score += 20;
      reasons.push('email format looks invalid');
      return score;
    }

    if (this.disposableDomains.has(domain)) {
      score += 45;
      reasons.push('email domain is disposable');
    }

    if (localPart.includes('+') && localPart.split('+')[1]?.length > 8) {
      score += 8;
      reasons.push('email aliasing pattern is suspicious');
    }

    if (/\d{7,}/.test(localPart)) {
      score += 8;
      reasons.push('email local part contains long numeric sequence');
    }

    if (localPart.length >= 20 && /\d/.test(localPart)) {
      score += 6;
      reasons.push('email local part appears auto-generated');
    }

    return score;
  }

  private scoreDisplayName(displayName: string | undefined, reasons: string[]): number {
    if (!displayName) return 0;

    const value = displayName.trim().toLowerCase();
    let score = 0;

    if (/(free|promo|official|support|deal|followers)/.test(value)) {
      score += 10;
      reasons.push('display name contains spam keywords');
    }

    if (/\d{5,}/.test(value)) {
      score += 6;
      reasons.push('display name has long numeric sequence');
    }

    return score;
  }

  private scoreUserAgent(userAgent: string | undefined, reasons: string[]): number {
    if (!userAgent) return 0;

    const value = userAgent.toLowerCase();
    if (/(bot|spider|crawler|python|curl|wget|postman|insomnia)/.test(value)) {
      reasons.push('request signature looks automated');
      return 18;
    }

    return 0;
  }

  private async scoreIpVelocity(ipAddress: string | undefined, reasons: string[]): Promise<number> {
    if (!ipAddress) return 0;

    const normalizedIp = ipAddress.split(',')[0].trim();
    if (!normalizedIp) return 0;

    const key = `signup:velocity:${normalizedIp}`;

    try {
      const count = await this.cacheService.incr(key);
      if (count === 1) {
        await this.cacheService.expire(key, 3600);
      }

      if (count >= 15) {
        reasons.push('high registration velocity from the same IP');
        return 30;
      }

      if (count >= 8) {
        reasons.push('elevated registration velocity from the same IP');
        return 20;
      }

      if (count >= 5) {
        reasons.push('multiple registrations from the same IP');
        return 10;
      }
    } catch (error) {
      this.logger.warn(
        `Unable to apply IP velocity signal for ${normalizedIp}: ${(error as Error).message}`,
      );
    }

    return 0;
  }
}
