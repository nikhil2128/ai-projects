import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Neo4jService } from '../neo4j/neo4j.service';

export interface NearbyUser {
  id: number;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  locationName: string | null;
  distance: number;
  mutualConnections: number;
  isFollowing: boolean;
  score: number;
}

const EARTH_RADIUS_KM = 6371;

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly neo4jService: Neo4jService,
  ) {}

  /**
   * Haversine formula — returns distance in km between two lat/lng points.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async getNearbyUsers(
    currentUserId: number,
    radiusKm = 50,
    page = 1,
    limit = 20,
  ): Promise<{ users: NearbyUser[]; total: number; page: number; totalPages: number; radiusKm: number }> {
    const currentUser = await this.userRepository.findOneBy({ id: currentUserId });
    if (!currentUser?.latitude || !currentUser?.longitude) {
      return { users: [], total: 0, page, totalPages: 0, radiusKm };
    }

    // Bounding-box pre-filter to avoid scanning every user with haversine
    const latDelta = radiusKm / 111.32;
    const lonDelta = radiusKm / (111.32 * Math.cos((currentUser.latitude * Math.PI) / 180));

    const candidates = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id != :currentUserId', { currentUserId })
      .andWhere('user.latitude IS NOT NULL')
      .andWhere('user.longitude IS NOT NULL')
      .andWhere('user.latitude BETWEEN :minLat AND :maxLat', {
        minLat: currentUser.latitude - latDelta,
        maxLat: currentUser.latitude + latDelta,
      })
      .andWhere('user.longitude BETWEEN :minLon AND :maxLon', {
        minLon: currentUser.longitude - lonDelta,
        maxLon: currentUser.longitude + lonDelta,
      })
      .getMany();

    // Precise haversine filter
    const nearbyWithDistance = candidates
      .map((u) => ({
        user: u,
        distance: this.haversineDistance(
          currentUser.latitude!,
          currentUser.longitude!,
          u.latitude!,
          u.longitude!,
        ),
      }))
      .filter((entry) => entry.distance <= radiusKm);

    if (nearbyWithDistance.length === 0) {
      return { users: [], total: 0, page, totalPages: 0, radiusKm };
    }

    const candidateIds = nearbyWithDistance.map((e) => e.user.id);

    // Query Neo4j: which candidates the user already follows + mutual connection counts
    const { followingSet, mutualCounts } = await this.neo4jService.read(async (tx) => {
      const followingResult = await tx.run(
        `MATCH (me:User {id: $userId})-[:FOLLOWS]->(followed:User)
         WHERE followed.id IN $candidateIds
         RETURN followed.id AS id`,
        { userId: currentUserId, candidateIds },
      );
      const followingIds = new Set(
        followingResult.records.map(
          (r: { get: (key: string) => { toNumber: () => number } }) => r.get('id').toNumber(),
        ),
      );

      // Mutual connections: people that both current user and the candidate follow
      const mutualResult = await tx.run(
        `UNWIND $candidateIds AS cid
         OPTIONAL MATCH (me:User {id: $userId})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(candidate:User {id: cid})
         RETURN cid AS candidateId, count(mutual) AS mutuals`,
        { userId: currentUserId, candidateIds },
      );
      const mutuals = new Map<number, number>();
      for (const r of mutualResult.records) {
        mutuals.set(
          (r.get('candidateId') as { toNumber?: () => number }).toNumber?.()
            ?? (r.get('candidateId') as number),
          (r.get('mutuals') as { toNumber?: () => number }).toNumber?.()
            ?? (r.get('mutuals') as number),
        );
      }

      return { followingSet: followingIds, mutualCounts: mutuals };
    });

    // Build scored results — closer distance + more mutual connections = higher score
    const scored: NearbyUser[] = nearbyWithDistance.map(({ user: u, distance }) => {
      const mutualConnections = mutualCounts.get(u.id) ?? 0;
      const isFollowing = followingSet.has(u.id);

      // Distance score: inversely proportional, max 100 at 0km, 0 at radiusKm
      const distanceScore = Math.max(0, 100 * (1 - distance / radiusKm));
      // Mutual connection bonus: each mutual adds 15 points
      const mutualScore = mutualConnections * 15;
      const score = distanceScore + mutualScore;

      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        bio: u.bio,
        avatarUrl: u.avatarUrl,
        locationName: u.locationName,
        distance: Math.round(distance * 10) / 10,
        mutualConnections,
        isFollowing,
        score,
      };
    });

    // Users not yet followed rank first, then by score descending
    scored.sort((a, b) => {
      if (a.isFollowing !== b.isFollowing) return a.isFollowing ? 1 : -1;
      return b.score - a.score;
    });

    const total = scored.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = scored.slice((page - 1) * limit, page * limit);

    return { users: paginated, total, page, totalPages, radiusKm };
  }
}
