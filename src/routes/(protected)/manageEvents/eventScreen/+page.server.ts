import { redirect } from '@sveltejs/kit';

import { requireUser } from '$lib/auth-guards.server';
import { resolveEventContext } from '$lib/event-context.server';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireUser(locals);

	const context = await resolveEventContext(locals, url);
	const selectedEvent = context.events.find((item) => item.id === context.selectedEventId) ?? null;
	const selectedCommittee =
		context.committees.find((item) => item.id === context.selectedParticipantCommitteeId) ?? null;

	if (
		context.selectedEventId &&
		context.selectedParticipantCommitteeId &&
		(context.requestedEventId !== context.selectedEventId ||
			context.requestedParticipantCommitteeId !== context.selectedParticipantCommitteeId)
	) {
		throw redirect(
			303,
			`/manageEvents/eventScreen?eventId=${context.selectedEventId}&participantCommitteeId=${context.selectedParticipantCommitteeId}`
		);
	}

	let participantCountryCount = 0;
	let topicsCount = 0;

	if (selectedCommittee) {
		const [participantCountriesResult, topicsResult] = await Promise.all([
			locals.supabase
				.from('participant_countries')
				.select('id', { head: true, count: 'exact' })
				.eq('participant_committee_id', selectedCommittee.id),
			locals.supabase
				.from('topics')
				.select('id', { head: true, count: 'exact' })
				.eq('participant_committee_id', selectedCommittee.id)
		]);

		participantCountryCount = participantCountriesResult.count ?? 0;
		topicsCount = topicsResult.count ?? 0;
	}

	return {
		role: locals.role,
		events: context.events,
		committees: context.committees,
		selectedEventId: context.selectedEventId,
		selectedParticipantCommitteeId: context.selectedParticipantCommitteeId,
		selectedEvent,
		selectedCommittee,
		participantCountryCount,
		topicsCount
	};
};
