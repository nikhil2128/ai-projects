const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  localStorage.setItem('token', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
}

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

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken();
      }
      await refreshPromise;
      refreshPromise = null;

      const newToken = localStorage.getItem('token');
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } catch {
      refreshPromise = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }

  return res.json();
}

export type VerificationStatus = 'pending' | 'verified' | 'flagged' | 'restricted';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  verificationStatus?: VerificationStatus;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface VerificationCheck {
  score: number;
  passed: boolean;
  detail: string;
}

export interface VerificationStatusResponse {
  status: VerificationStatus;
  score: number;
  emailVerified: boolean;
  verifiedAt: string | null;
  checks: Record<string, VerificationCheck> | null;
  pendingActions: string[];
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
  thumbnailUrl?: string;
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

export interface CursorFeedResponse {
  posts: PostItem[];
  nextCursor: string | null;
  hasMore: boolean;
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

    refresh: (refreshToken: string) =>
      request<AuthResponse>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
  },

  users: {
    getProfile: (username: string) =>
      request<UserProfile>(`/api/users/${username}`),

    search: (q: string) =>
      request<AuthUser[]>(`/api/users/search?q=${encodeURIComponent(q)}`),

    suggest: (q: string) =>
      request<AuthUser[]>(`/api/users/suggest?q=${encodeURIComponent(q)}`),

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

    getFeedCursor: (cursor?: string, limit = 20) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      return request<CursorFeedResponse>(`/api/posts/feed?${params}`);
    },

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

  verification: {
    getStatus: () =>
      request<VerificationStatusResponse>('/api/verification/status'),

    sendVerificationEmail: () =>
      request<{ message: string; verifyUrl: string }>(
        '/api/verification/send-verification-email',
        { method: 'POST' },
      ),

    verifyEmail: (token: string) =>
      request<{ success: boolean; message: string }>(
        `/api/verification/verify-email?token=${encodeURIComponent(token)}`,
      ),

    recheck: () =>
      request<{ message: string }>('/api/verification/recheck', { method: 'POST' }),
  },

  getImageUrl: (path: string) => {
    if (path.startsWith('http')) return path;
    return `${API_BASE}${path}`;
  },
};
