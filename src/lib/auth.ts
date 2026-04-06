import { createHash } from 'node:crypto';

function getExpectedToken(): string {
	const password = import.meta.env.ADMIN_PASSWORD ?? '';
	return createHash('sha256').update('admin:' + password).digest('hex');
}

export function isAdmin(request: Request): boolean {
	const cookie = request.headers.get('cookie') ?? '';
	const cookies = Object.fromEntries(
		cookie
			.split(';')
			.map((c) => c.trim().split('='))
			.filter((p) => p.length >= 2)
			.map(([k, ...v]) => [k.trim(), decodeURIComponent(v.join('='))])
	);
	return cookies['admin_token'] === getExpectedToken();
}

export function setAdminCookie(password: string): string | null {
	const expected = import.meta.env.ADMIN_PASSWORD ?? '';
	if (password !== expected) return null;
	const token = getExpectedToken();
	return `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

export function clearAdminCookie(): string {
	return `admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
