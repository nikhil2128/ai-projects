import crypto from "crypto";

export function hashPassword(
	password: string,
	salt?: string,
): { hash: string; salt: string } {
	const s = salt || crypto.randomBytes(16).toString("hex");
	const hash = crypto.scryptSync(password, s, 64).toString("hex");
	return { hash, salt: s };
}

export function verifyPassword(
	password: string,
	storedHash: string,
	salt: string,
): boolean {
	const derived = crypto.scryptSync(password, salt, 64).toString("hex");
	return crypto.timingSafeEqual(
		Buffer.from(derived, "hex"),
		Buffer.from(storedHash, "hex"),
	);
}
