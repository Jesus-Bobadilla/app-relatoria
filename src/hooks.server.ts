import type { Handle } from '@sveltejs/kit';
import { supabaseServerClient } from '$lib/server';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = supabaseServerClient(event);

	const {
		data: { user },
		error: userError
	} = await event.locals.supabase.auth.getUser();

	if (userError) {
		event.locals.user = null;
		event.locals.role = null;
		return resolve(event);
	}

	event.locals.user = user;

	if (!user) {
		event.locals.role = null;
		return resolve(event);
	}

	const { data: profile, error: profileError } = await event.locals.supabase
		.from('profiles')
		.select('role')
		.eq('auth_id', user.id)
		.maybeSingle();

	if (profileError) {
        event.locals.role = null;
        return resolve(event);
    }

	event.locals.role = profile?.role ?? null;

	return resolve(event);
};
