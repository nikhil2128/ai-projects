import { Router, type Request, type Response } from "express";
import * as store from "../store.js";
import { verifyPassword } from "../crypto.js";
import { createToken, requireAuth } from "../auth.js";

const router = Router();

router.post("/login", (req: Request, res: Response) => {
	const { username, password } = req.body;

	if (!username || !password) {
		res.status(400).json({
			success: false,
			error: "Username and password are required",
		});
		return;
	}

	const user = store.getUserByUsername(username);
	if (!user) {
		res.status(401).json({ success: false, error: "Invalid credentials" });
		return;
	}

	if (!verifyPassword(password, user.password_hash, user.password_salt)) {
		res.status(401).json({ success: false, error: "Invalid credentials" });
		return;
	}

	const token = createToken(user.id);

	res.json({
		success: true,
		data: {
			token,
			user: {
				id: user.id,
				username: user.username,
				displayName: user.display_name,
				role: user.role,
			},
		},
	});
});

router.get("/me", requireAuth, (req: Request, res: Response) => {
	res.json({ success: true, data: req.user });
});

export default router;
