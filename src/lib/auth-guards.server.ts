import { error, redirect } from '@sveltejs/kit';

import type { Role } from '$lib/types/auth';

export function isAdminRole(role: Role | null): role is 'admin' | 'superadmin' {
	return role === 'admin' || role === 'superadmin';
}

export function requireUser(locals: App.Locals) {
	if (!locals.user) {
		throw redirect(303, '/');
	}

	return locals.user;
}

export function requireProfileId(locals: App.Locals) {
	const profileId = locals.profileId;

	if (!profileId) {
		throw error(403, 'A profile is required to access this resource.');
	}

	return profileId;
}

export function requireAdmin(locals: App.Locals) {
	requireUser(locals);

	if (!isAdminRole(locals.role)) {
		throw redirect(303, '/portal');
	}
}
