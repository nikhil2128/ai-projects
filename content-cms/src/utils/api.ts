import type {
	AuthUser,
	ContentModel,
	ContentEntry,
	EntryVersion,
	LocalizationSettings,
} from "../types";

const TOKEN_KEY = "cms_auth_token";

interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

export function getStoredToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
	localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
	url: string,
	options?: RequestInit,
): Promise<ApiResponse<T>> {
	const token = getStoredToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};

	const res = await fetch(url, { ...options, headers });
	const json = await res.json();

	if (!res.ok) {
		if (
			res.status === 401 &&
			url !== "/api/auth/login" &&
			url !== "/api/auth/me"
		) {
			clearStoredToken();
			window.location.reload();
		}
		throw new Error(json.error || "Request failed");
	}

	return json;
}

export async function login(
	username: string,
	password: string,
): Promise<{ token: string; user: AuthUser }> {
	const res = await request<{ token: string; user: AuthUser }>(
		"/api/auth/login",
		{
			method: "POST",
			body: JSON.stringify({ username, password }),
		},
	);
	const data = res.data!;
	setStoredToken(data.token);
	return data;
}

export async function getMe(): Promise<AuthUser> {
	const res = await request<AuthUser>("/api/auth/me");
	return res.data!;
}

export async function fetchModels(): Promise<ContentModel[]> {
	const res = await request<ContentModel[]>("/api/models");
	return res.data ?? [];
}

export async function fetchModel(id: string): Promise<ContentModel> {
	const res = await request<ContentModel>(`/api/models/${id}`);
	return res.data!;
}

export async function createModel(
	data: Pick<ContentModel, "name" | "description" | "fields">,
): Promise<ContentModel> {
	const res = await request<ContentModel>("/api/models", {
		method: "POST",
		body: JSON.stringify(data),
	});
	return res.data!;
}

export async function updateModel(
	id: string,
	data: Partial<Pick<ContentModel, "name" | "description" | "fields">>,
): Promise<ContentModel> {
	const res = await request<ContentModel>(`/api/models/${id}`, {
		method: "PUT",
		body: JSON.stringify(data),
	});
	return res.data!;
}

export async function deleteModel(id: string): Promise<void> {
	await request(`/api/models/${id}`, { method: "DELETE" });
}

export async function fetchLocalizationSettings(): Promise<LocalizationSettings> {
	const res = await request<LocalizationSettings>("/api/settings/localization");
	return res.data!;
}

export async function updateLocalizationSettings(
	enabledLocales: string[],
): Promise<LocalizationSettings> {
	const res = await request<LocalizationSettings>(
		"/api/settings/localization",
		{
			method: "PUT",
			body: JSON.stringify({ enabledLocales }),
		},
	);
	return res.data!;
}

export async function fetchEntries(modelId: string): Promise<ContentEntry[]> {
	const res = await request<ContentEntry[]>(`/api/entries/model/${modelId}`);
	return res.data ?? [];
}

export async function fetchEntry(id: string): Promise<ContentEntry> {
	const res = await request<ContentEntry>(`/api/entries/${id}`);
	return res.data!;
}

export async function createEntry(
	modelId: string,
	values: Record<string, unknown>,
): Promise<ContentEntry> {
	const res = await request<ContentEntry>("/api/entries", {
		method: "POST",
		body: JSON.stringify({ modelId, values }),
	});
	return res.data!;
}

export async function updateEntry(
	id: string,
	values: Record<string, unknown>,
): Promise<ContentEntry> {
	const res = await request<ContentEntry>(`/api/entries/${id}`, {
		method: "PUT",
		body: JSON.stringify({ values }),
	});
	return res.data!;
}

export async function deleteEntry(id: string): Promise<void> {
	await request(`/api/entries/${id}`, { method: "DELETE" });
}

export async function publishEntry(id: string): Promise<ContentEntry> {
	const res = await request<ContentEntry>(`/api/entries/${id}/publish`, {
		method: "PUT",
	});
	return res.data!;
}

export async function unpublishEntry(id: string): Promise<ContentEntry> {
	const res = await request<ContentEntry>(`/api/entries/${id}/unpublish`, {
		method: "PUT",
	});
	return res.data!;
}

export async function archiveEntry(id: string): Promise<ContentEntry> {
	const res = await request<ContentEntry>(`/api/entries/${id}/archive`, {
		method: "PUT",
	});
	return res.data!;
}

export async function fetchEntryVersions(id: string): Promise<EntryVersion[]> {
	const res = await request<EntryVersion[]>(`/api/entries/${id}/versions`);
	return res.data ?? [];
}
