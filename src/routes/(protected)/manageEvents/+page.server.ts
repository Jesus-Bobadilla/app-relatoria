import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (locals.role !== 'admin') {
		throw redirect(303, '/manageEvents/eventScreen');
	}
	return {};
}
