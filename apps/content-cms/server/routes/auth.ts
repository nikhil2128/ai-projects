import { Router, type Request, type Response } from "express";
import * as store from "../store.js";
import { verifyPassword } from "../crypto.js";
import { createToken, requireAuth, requireRole } from "../auth.js";

const router = Router();

function slugifyCompanyName(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_]+/g, "-")
		.replace(/-+/g, "-");
}

router.post("/login", (req: Request, res: Response) => {
	const { companySlug, username, password } = req.body;

	if (!companySlug || !username || !password) {
		res.status(400).json({
			success: false,
			error: "Company, username, and password are required",
		});
		return;
	}

	const company = store.getCompanyBySlug(String(companySlug).trim());
	if (!company) {
		res.status(401).json({ success: false, error: "Invalid credentials" });
		return;
	}

	const user = store.getUserByUsername(company.id, String(username).trim());
	if (!user) {
		res.status(401).json({ success: false, error: "Invalid credentials" });
		return;
	}

	if (!verifyPassword(password, user.password_hash, user.password_salt)) {
		res.status(401).json({ success: false, error: "Invalid credentials" });
		return;
	}

	const token = createToken(user.id, company.id);

	res.json({
		success: true,
		data: {
			token,
			user: {
				id: user.id,
				companyId: company.id,
				companyName: company.name,
				companySlug: company.slug,
				username: user.username,
				displayName: user.display_name,
				role: user.role,
			},
		},
	});
});

router.post("/register-company", (req: Request, res: Response) => {
	const {
		companyName,
		companySlug,
		adminDisplayName,
		adminUsername,
		password,
	} = req.body;

	if (
		!companyName ||
		!adminDisplayName ||
		!adminUsername ||
		!password
	) {
		res.status(400).json({
			success: false,
			error:
				"Company name, admin display name, admin username, and password are required",
		});
		return;
	}

	const normalizedSlug = slugifyCompanyName(
		typeof companySlug === "string" && companySlug.trim()
			? companySlug
			: companyName,
	);

	if (!normalizedSlug) {
		res.status(400).json({
			success: false,
			error: "Company slug must include letters or numbers",
		});
		return;
	}

	try {
		const { company, user } = store.createCompanyWithAdmin({
			companyName: String(companyName).trim(),
			companySlug: normalizedSlug,
			adminDisplayName: String(adminDisplayName).trim(),
			adminUsername: String(adminUsername).trim(),
			password: String(password),
		});
		const token = createToken(user.id, company.id);

		res.status(201).json({
			success: true,
			data: {
				token,
				user: {
					id: user.id,
					companyId: company.id,
					companyName: company.name,
					companySlug: company.slug,
					username: user.username,
					displayName: user.displayName,
					role: user.role,
				},
			},
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			error:
				error instanceof Error ? error.message : "Unable to register company",
		});
	}
});

router.get("/me", requireAuth, (req: Request, res: Response) => {
	res.json({ success: true, data: req.user });
});

router.get(
	"/users",
	requireAuth,
	requireRole("approver"),
	(req: Request, res: Response) => {
		const users = store.listCompanyUsers(req.user!.companyId);
		res.json({ success: true, data: users });
	},
);

router.post(
	"/users",
	requireAuth,
	requireRole("approver"),
	(req: Request, res: Response) => {
		const { username, displayName, password, role } = req.body;

		if (!username || !displayName || !password || !role) {
			res.status(400).json({
				success: false,
				error: "Username, display name, password, and role are required",
			});
			return;
		}

		if (!["writer", "reviewer", "approver"].includes(String(role))) {
			res.status(400).json({
				success: false,
				error: "Role must be writer, reviewer, or approver",
			});
			return;
		}

		try {
			const user = store.createCompanyUser(req.user!.companyId, {
				username: String(username).trim(),
				displayName: String(displayName).trim(),
				password: String(password),
				role,
			});
			res.status(201).json({ success: true, data: user });
		} catch (error) {
			res.status(400).json({
				success: false,
				error: error instanceof Error ? error.message : "Unable to create user",
			});
		}
	},
);

export default router;
