import { redirect } from '@sveltejs/kit';
import type { Role } from '$lib/types/auth.js';

export async function load({ locals }) {
	if (locals.role !== 'admin') {
		throw redirect(303, '/portal');
	}
	return {};
}
