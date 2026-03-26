import type {
	AuthResponse,
	Profile,
	BrowseFilters,
	Interest,
	FamilyProfile,
	SharedProfile,
	Shortlist,
	RecommendationResponse,
	BrowseResponse,
} from "./types";

const BASE = "/api";

function getHeaders(): HeadersInit {
	const headers: HeadersInit = { "Content-Type": "application/json" };
	const token = localStorage.getItem("token");
	if (token) headers["Authorization"] = `Bearer ${token}`;
	return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		...options,
		headers: { ...getHeaders(), ...options?.headers },
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: "Request failed" }));
		throw new Error(body.error || `HTTP ${res.status}`);
	}

	return res.json();
}

export const api = {
	auth: {
		register(data: {
			email: string;
			password: string;
			firstName?: string;
			lastName?: string;
		}): Promise<AuthResponse> {
			return request("/auth/register", {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		login(data: { email: string; password: string }): Promise<AuthResponse> {
			return request("/auth/login", {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		me(): Promise<{
			user: { id: string; email: string };
			profile: Profile | null;
			familyProfile: FamilyProfile | null;
			hasProfile: boolean;
			hasFamilyProfile: boolean;
		}> {
			return request("/auth/me");
		},
	},
	profiles: {
		getMyProfile(): Promise<Profile> {
			return request("/profiles/me");
		},
		updateMyProfile(data: Partial<Profile>): Promise<Profile> {
			return request("/profiles/me", {
				method: "PUT",
				body: JSON.stringify(data),
			});
		},
		browse(
			filters: Partial<BrowseFilters>,
			page = 1,
			pageSize = 24,
		): Promise<BrowseResponse> {
			const params = new URLSearchParams();
			Object.entries(filters).forEach(([key, value]) => {
				if (value) params.set(key, value);
			});
			params.set("page", String(page));
			params.set("pageSize", String(pageSize));
			return request(`/profiles/browse?${params.toString()}`);
		},
		getRecommendations(): Promise<RecommendationResponse> {
			return request("/profiles/recommendations/daily");
		},
		getProfile(userId: string): Promise<Profile> {
			return request(`/profiles/${userId}`);
		},
		sendInterest(userId: string): Promise<Interest> {
			return request(`/profiles/${userId}/interest`, { method: "POST" });
		},
		getInterests(): Promise<{ sent: Interest[]; received: Interest[] }> {
			return request("/profiles/interests/list");
		},
		updateInterest(
			interestId: string,
			status: "accepted" | "declined",
		): Promise<Interest> {
			return request(`/profiles/interests/${interestId}`, {
				method: "PATCH",
				body: JSON.stringify({ status }),
			});
		},
	},
	family: {
		getMyFamilyProfile(): Promise<FamilyProfile> {
			return request("/family/me");
		},
		updateMyFamilyProfile(
			data: Partial<FamilyProfile>,
		): Promise<FamilyProfile> {
			return request("/family/me", {
				method: "PUT",
				body: JSON.stringify(data),
			});
		},
		getFamilyProfile(userId: string): Promise<FamilyProfile> {
			return request(`/family/user/${userId}`);
		},
		shareProfile(data: {
			toUserId: string;
			sharedProfileUserId: string;
			message?: string;
		}): Promise<SharedProfile> {
			return request("/family/share", {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		getSharedProfiles(): Promise<{
			sent: SharedProfile[];
			received: SharedProfile[];
		}> {
			return request("/family/shared");
		},
		updateSharedProfileStatus(
			id: string,
			status: "viewed" | "interested" | "declined",
		): Promise<SharedProfile> {
			return request(`/family/shared/${id}`, {
				method: "PATCH",
				body: JSON.stringify({ status }),
			});
		},
	},
	shortlist: {
		getAll(): Promise<{ shortlist: Shortlist[] }> {
			return request("/shortlist");
		},
		getIds(): Promise<{ shortlistedUserIds: string[] }> {
			return request("/shortlist/ids");
		},
		add(userId: string, note?: string): Promise<Shortlist> {
			return request(`/shortlist/${userId}`, {
				method: "POST",
				body: JSON.stringify({ note: note || "" }),
			});
		},
		remove(userId: string): Promise<{ success: boolean }> {
			return request(`/shortlist/${userId}`, { method: "DELETE" });
		},
	},
};
