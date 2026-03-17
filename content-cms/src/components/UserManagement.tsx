import { useMemo, useState } from "react";
import type { CompanyUser, UserRole } from "../types";

interface UserManagementProps {
	companyName: string;
	users: CompanyUser[];
	onCreateUser: (data: {
		username: string;
		displayName: string;
		password: string;
		role: UserRole;
	}) => Promise<void>;
}

const ROLE_OPTIONS: UserRole[] = ["writer", "reviewer", "approver"];

const ROLE_BADGE: Record<UserRole, string> = {
	writer: "bg-blue-100 text-blue-700",
	reviewer: "bg-amber-100 text-amber-700",
	approver: "bg-emerald-100 text-emerald-700",
};

export default function UserManagement({
	companyName,
	users,
	onCreateUser,
}: UserManagementProps) {
	const [displayName, setDisplayName] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<UserRole>("writer");
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	const sortedUsers = useMemo(
		() => [...users].sort((a, b) => a.displayName.localeCompare(b.displayName)),
		[users],
	);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!displayName.trim() || !username.trim() || !password.trim()) {
			setError("Display name, username, and password are required");
			return;
		}

		setSaving(true);
		setError("");
		try {
			await onCreateUser({
				displayName: displayName.trim(),
				username: username.trim(),
				password,
				role,
			});
			setDisplayName("");
			setUsername("");
			setPassword("");
			setRole("writer");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to create user");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="max-w-7xl mx-auto px-6 py-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
				<div className="flex items-start justify-between gap-4 mb-6">
					<div>
						<h2 className="text-xl font-semibold text-slate-800">
							Team members
						</h2>
						<p className="text-sm text-slate-500 mt-1">
							Users in {companyName} can sign in with their assigned role.
						</p>
					</div>
					<div className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
						{users.length} users
					</div>
				</div>

				<div className="space-y-3">
					{sortedUsers.map((user) => (
						<div
							key={user.id}
							className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/70"
						>
							<div className="min-w-0">
								<p className="text-sm font-medium text-slate-800">
									{user.displayName}
								</p>
								<p className="text-sm text-slate-500">
									@{user.username}
								</p>
							</div>
							<span
								className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE[user.role]}`}
							>
								{user.role}
							</span>
						</div>
					))}
				</div>
			</section>

			<section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
				<h2 className="text-xl font-semibold text-slate-800">
					Add user
				</h2>
				<p className="text-sm text-slate-500 mt-1 mb-6">
					Create a new company user and assign the correct role before they sign in.
				</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
							{error}
						</div>
					)}

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1.5">
							Display name
						</label>
						<input
							type="text"
							value={displayName}
							onChange={(event) => setDisplayName(event.target.value)}
							placeholder="Jane Editor"
							className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1.5">
							Username
						</label>
						<input
							type="text"
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							placeholder="jane"
							autoComplete="off"
							className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1.5">
							Temporary password
						</label>
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							placeholder="Choose a password"
							autoComplete="new-password"
							className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1.5">
							Role
						</label>
						<select
							value={role}
							onChange={(event) => setRole(event.target.value as UserRole)}
							className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
						>
							{ROLE_OPTIONS.map((roleOption) => (
								<option key={roleOption} value={roleOption}>
									{roleOption}
								</option>
							))}
						</select>
					</div>

					<button
						type="submit"
						disabled={saving}
						className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{saving ? "Creating user..." : "Create User"}
					</button>
				</form>
			</section>
		</div>
	);
}
