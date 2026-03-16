import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import * as store from "./store.js";

export type UserRole = "writer" | "reviewer" | "approver";

export interface AuthUser {
	id: string;
	username: string;
	displayName: string;
	role: UserRole;
}

const JWT_SECRET =
	process.env.CMS_JWT_SECRET || "contentforge-dev-secret-do-not-use-in-prod";
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

interface TokenPayload {
	userId: string;
	iat: number;
	exp: number;
}

function hmacSign(header: string, body: string): string {
	return crypto
		.createHmac("sha256", JWT_SECRET)
		.update(`${header}.${body}`)
		.digest("base64url");
}

export function createToken(userId: string): string {
	const header = Buffer.from(
		JSON.stringify({ alg: "HS256", typ: "JWT" }),
	).toString("base64url");
	const payload = Buffer.from(
		JSON.stringify({
			userId,
			iat: Date.now(),
			exp: Date.now() + TOKEN_EXPIRY_MS,
		}),
	).toString("base64url");
	const signature = hmacSign(header, payload);
	return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
	const parts = token.split(".");
	if (parts.length !== 3) return null;

	const [header, body, signature] = parts;
	const expected = hmacSign(header, body);

	if (signature.length !== expected.length) return null;
	if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
		return null;
	}

	try {
		const payload = JSON.parse(
			Buffer.from(body, "base64url").toString(),
		) as TokenPayload;
		if (payload.exp < Date.now()) return null;
		return payload;
	} catch {
		return null;
	}
}

declare global {
	namespace Express {
		interface Request {
			user?: AuthUser;
		}
	}
}

export function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const header = req.headers.authorization;
	if (!header?.startsWith("Bearer ")) {
		res.status(401).json({ success: false, error: "Authentication required" });
		return;
	}

	const payload = verifyToken(header.slice(7));
	if (!payload) {
		res.status(401).json({ success: false, error: "Invalid or expired token" });
		return;
	}

	const user = store.getUserById(payload.userId);
	if (!user) {
		res.status(401).json({ success: false, error: "User not found" });
		return;
	}

	req.user = {
		id: user.id,
		username: user.username,
		displayName: user.display_name,
		role: user.role as UserRole,
	};
	next();
}

export function requireRole(...roles: UserRole[]) {
	return (req: Request, res: Response, next: NextFunction): void => {
		if (!req.user) {
			res
				.status(401)
				.json({ success: false, error: "Authentication required" });
			return;
		}

		if (!roles.includes(req.user.role)) {
			res.status(403).json({
				success: false,
				error: `Access denied. Required role: ${roles.join(" or ")}`,
			});
			return;
		}

		next();
	};
}
