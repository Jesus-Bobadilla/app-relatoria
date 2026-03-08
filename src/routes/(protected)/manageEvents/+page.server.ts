import { fail, redirect } from '@sveltejs/kit';

import { requireAdmin } from '$lib/auth-guards.server';
import { parseRequiredUuid } from '$lib/validators.server';

import type { Actions, PageServerLoad } from './$types';

interface EventRow {
	id: string;
	event_name: string | null;
	description: string | null;
	start_date: string | null;
	place: string | null;
	logo_url: string | null;
	participant_committee: Array<{ id: string }> | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.role === 'user') {
		throw redirect(303, '/manageEvents/eventScreen');
	}

	requireAdmin(locals);

	const { data, error } = await locals.supabase
		.from('events')
		.select('id, event_name, description, start_date, place, logo_url, participant_committee(id)')
		.order('start_date', { ascending: false, nullsFirst: false })
		.order('event_name', { ascending: true });

	if (error) {
		return {
			events: []
		};
	}

	const events = ((data ?? []) as EventRow[]).map((row) => ({
		id: row.id,
		eventName: row.event_name ?? 'Untitled event',
		description: row.description ?? '',
		startDate: row.start_date,
		place: row.place ?? '',
		logoUrl: row.logo_url ?? '',
		participantCommitteeCount: row.participant_committee?.length ?? 0
	}));

	return {
		events
	};
};

export const actions: Actions = {
	deleteEvent: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');

		const { error } = await locals.supabase.from('events').delete().eq('id', eventId);

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Event deleted.'
		};
	}
};
