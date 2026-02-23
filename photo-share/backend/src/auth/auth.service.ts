import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { ProfileVerificationStatus } from '../users/profile-verification-status.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SearchService } from '../search/search.service';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ProfileScreeningService } from './profile-screening.service';

interface RegistrationContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly searchService: SearchService,
    private readonly neo4jService: Neo4jService,
    private readonly profileScreeningService: ProfileScreeningService,
  ) {}

  async register(dto: RegisterDto, context: RegistrationContext = {}) {
    const existing = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      throw new ConflictException('Username or email already taken');
    }

    const screeningResult = await this.profileScreeningService.screenNewProfile({
      username: dto.username,
      email: dto.email,
      displayName: dto.displayName,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    if (screeningResult.isRejected) {
      throw new ForbiddenException(
        'We could not verify this signup automatically. Please try again with another email or network.',
      );
    }

    // Use 12 rounds for better security at scale
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
      verificationStatus: screeningResult.status,
      verificationScore: screeningResult.score,
      verificationReasons:
        screeningResult.reasons.length > 0
          ? screeningResult.reasons.join('; ')
          : null,
      isDiscoverable: screeningResult.status === ProfileVerificationStatus.VERIFIED,
      verifiedAt:
        screeningResult.status === ProfileVerificationStatus.VERIFIED
          ? new Date()
          : null,
    });
    const saved = await this.userRepository.save(user);

    // Create user node in Neo4j for social graph
    await this.neo4jService.write(async (tx) => {
      await tx.run(
        'MERGE (u:User {id: $userId})',
        { userId: saved.id },
      );
    });

    if (saved.isDiscoverable) {
      // Index only verified profiles in Elasticsearch so suspicious accounts stay hidden.
      await this.searchService.indexUser({
        id: saved.id,
        username: saved.username,
        displayName: saved.displayName,
        bio: saved.bio,
        avatarUrl: saved.avatarUrl,
      });
    }

    return this.buildAuthResponse(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { username: dto.username },
      select: [
        'id',
        'username',
        'email',
        'password',
        'displayName',
        'avatarUrl',
        'verificationStatus',
      ],
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: number) {
    return this.userRepository.findOneOrFail({ where: { id: userId } });
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
      });
      const user = await this.userRepository.findOneOrFail({
        where: { id: payload.sub },
      });
      return this.buildAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, username: user.username };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        verificationStatus:
          user.verificationStatus ?? ProfileVerificationStatus.VERIFIED,
      },
    };
  }
}
