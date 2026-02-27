import { fail, redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = formData.get('username'); // keep your input name for now
		const password = formData.get('password');

		if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
			return fail(400, { message: 'Email and password are required.' });
		}

		const { error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			return fail(401, { message: error.message });
		}

		// 303 is the normal "POST -> redirect to GET" after form submits
		throw redirect(303, '/portal');
	}
};
