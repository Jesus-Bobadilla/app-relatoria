import type { Handle } from '@sveltejs/kit';
import { supabaseServerClient } from '$lib/server';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = supabaseServerClient(event);

	const {
		data: { user }
	} = await event.locals.supabase.auth.getUser();
	event.locals.user = user;

	return resolve(event);
};
