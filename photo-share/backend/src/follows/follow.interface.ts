export interface FollowRelationship {
  followerId: number;
  followingId: number;
  createdAt: Date;
}

export interface FollowedUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  followedAt: Date;
}
