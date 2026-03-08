import { json } from '@sveltejs/kit';

import { requireUser } from '$lib/auth-guards.server';
import { loadDebateSnapshot } from '$lib/debates.server';
import { assertParticipantCommitteeAccess } from '$lib/event-context.server';
import { parseRequiredUuid } from '$lib/validators.server';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	requireUser(locals);

	const eventId = parseRequiredUuid(url.searchParams.get('eventId'), 'eventId');
	const participantCommitteeId = parseRequiredUuid(
		url.searchParams.get('participantCommitteeId'),
		'participantCommitteeId'
	);

	const committee = await assertParticipantCommitteeAccess(locals, participantCommitteeId);
	if (committee.eventId !== eventId) {
		return json({ message: 'Event and participant committee do not match.' }, { status: 400 });
	}

	const snapshot = await loadDebateSnapshot(locals, participantCommitteeId);
	return json(snapshot);
};
