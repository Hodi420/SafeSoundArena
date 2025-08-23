import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer | null {
	const key = process.env.ENCRYPTION_KEY || process.env.TOKENS_ENC_SECRET;
	if (!key) return null;
	// Expect base64 or hex; try base64 first
	try {
		const buf = Buffer.from(key, 'base64');
		if (buf.length === 32) return buf;
	} catch {}
	try {
		const buf = Buffer.from(key, 'hex');
		if (buf.length === 32) return buf;
	} catch {}
	return null;
}

export function encryptSecret(plain: string): { enc: string; iv: string; tag: string } | null {
	const key = getKey();
	if (!key) return null;
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(ALGO, key, iv);
	const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return {
		enc: ciphertext.toString('base64'),
		iv: iv.toString('base64'),
		tag: tag.toString('base64')
	};
}

export function decryptSecret(enc: { enc: string; iv: string; tag: string }): string | null {
	const key = getKey();
	if (!key) return null;
	const iv = Buffer.from(enc.iv, 'base64');
	const tag = Buffer.from(enc.tag, 'base64');
	const data = Buffer.from(enc.enc, 'base64');
	const decipher = crypto.createDecipheriv(ALGO, key, iv);
	decipher.setAuthTag(tag);
	const plain = Buffer.concat([decipher.update(data), decipher.final()]);
	return plain.toString('utf8');
}


