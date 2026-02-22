const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }

  return res.json();
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface UserProfile extends AuthUser {
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  createdAt: string;
}

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

export interface NearbyUsersResponse {
  users: NearbyUser[];
  total: number;
  page: number;
  totalPages: number;
  radiusKm: number;
}

export interface PostItem {
  id: number;
  imageUrl: string;
  caption: string;
  filter: string;
  userId: number;
  user: AuthUser;
  reactionCounts: Record<string, number>;
  userReactions: string[];
  totalReactions: number;
  createdAt: string;
}

export interface FeedResponse {
  posts: PostItem[];
  total: number;
  page: number;
  totalPages: number;
}

export const api = {
  auth: {
    register: (data: {
      username: string;
      email: string;
      password: string;
      displayName?: string;
    }) => request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    login: (data: { username: string; password: string }) =>
      request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

    me: () => request<AuthUser>('/api/auth/me'),
  },

  users: {
    getProfile: (username: string) =>
      request<UserProfile>(`/api/users/${username}`),

    search: (q: string) =>
      request<AuthUser[]>(`/api/users/search?q=${encodeURIComponent(q)}`),

    updateLocation: (data: { latitude: number; longitude: number; locationName?: string }) =>
      request<AuthUser>('/api/users/location', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  recommendations: {
    nearby: (radius = 50, page = 1) =>
      request<NearbyUsersResponse>(
        `/api/recommendations/nearby?radius=${radius}&page=${page}`,
      ),
  },

  follows: {
    follow: (username: string) =>
      request<{ message: string }>(`/api/follows/${username}`, { method: 'POST' }),

    unfollow: (username: string) =>
      request<{ message: string }>(`/api/follows/${username}`, { method: 'DELETE' }),
  },

  posts: {
    create: (formData: FormData) =>
      request<PostItem>('/api/posts', { method: 'POST', body: formData }),

    getFeed: (page = 1) =>
      request<FeedResponse>(`/api/posts/feed?page=${page}`),

    getUserPosts: (username: string) =>
      request<PostItem[]>(`/api/posts/user/${username}`),

    delete: (id: number) =>
      request<{ message: string }>(`/api/posts/${id}`, { method: 'DELETE' }),
  },

  reactions: {
    toggle: (postId: number, emoji: string) =>
      request<{ action: string; emoji: string }>(
        `/api/posts/${postId}/reactions`,
        { method: 'POST', body: JSON.stringify({ emoji }) },
      ),
  },

  getImageUrl: (path: string) => `${API_BASE}${path}`,
};
