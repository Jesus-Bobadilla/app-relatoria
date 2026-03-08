import { fail, redirect } from '@sveltejs/kit';

import { requireUser } from '$lib/auth-guards.server';
import { assertParticipantCommitteeAccess, resolveEventContext } from '$lib/event-context.server';
import { parseRequiredString, parseRequiredUuid } from '$lib/validators.server';

import type { Actions, PageServerLoad } from './$types';

interface TopicRow {
	id: string;
	topic: number | null;
	description: string | null;
}

interface ParticipantCountryRow {
	id: string;
	country_id: number;
	countries: {
		name_english: string | null;
		name_spanish: string | null;
		name_french: string | null;
	} | Array<{
		name_english: string | null;
		name_spanish: string | null;
		name_french: string | null;
	}> | null;
}

interface VoteRow {
	id: number;
	topic_id: string;
	participant_country_id: string;
	vote: string;
}

const ALLOWED_VOTES = ['yes', 'no', 'abstain'] as const;

type VoteValue = (typeof ALLOWED_VOTES)[number];

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requireUser(locals);

	const context = await resolveEventContext(locals, url);
	if (!context.selectedEventId || !context.selectedParticipantCommitteeId) {
		return {
			events: context.events,
			committees: context.committees,
			selectedEventId: context.selectedEventId,
			selectedParticipantCommitteeId: context.selectedParticipantCommitteeId,
			topics: [],
			participantCountries: [],
			votesByKey: {} as Record<string, VoteValue>
		};
	}

	if (
		context.requestedEventId !== context.selectedEventId ||
		context.requestedParticipantCommitteeId !== context.selectedParticipantCommitteeId
	) {
		throw redirect(
			303,
			`/manageEvents/eventScreen/votes?eventId=${context.selectedEventId}&participantCommitteeId=${context.selectedParticipantCommitteeId}`
		);
	}

	const [topicsResult, participantCountriesResult] = await Promise.all([
		locals.supabase
			.from('topics')
			.select('id, topic, description')
			.eq('participant_committee_id', context.selectedParticipantCommitteeId)
			.order('topic', { ascending: true }),
		locals.supabase
			.from('participant_countries')
			.select('id, country_id, countries(name_english, name_spanish, name_french)')
			.eq('participant_committee_id', context.selectedParticipantCommitteeId)
			.order('country_id', { ascending: true })
	]);

	if (topicsResult.error || participantCountriesResult.error) {
		return {
			events: context.events,
			committees: context.committees,
			selectedEventId: context.selectedEventId,
			selectedParticipantCommitteeId: context.selectedParticipantCommitteeId,
			topics: [],
			participantCountries: [],
			votesByKey: {} as Record<string, VoteValue>
		};
	}

	const topics = (topicsResult.data ?? []) as unknown as TopicRow[];
	const participantCountries = (participantCountriesResult.data ?? []) as unknown as ParticipantCountryRow[];

	const topicIds = topics.map((item) => item.id);
	const participantCountryIds = participantCountries.map((item) => item.id);
	let votes: VoteRow[] = [];

	if (topicIds.length > 0 && participantCountryIds.length > 0) {
		const { data: votesData, error: votesError } = await locals.supabase
			.from('votes')
			.select('id, topic_id, participant_country_id, vote')
			.in('topic_id', topicIds)
			.in('participant_country_id', participantCountryIds);

		if (!votesError) {
			votes = (votesData ?? []) as VoteRow[];
		}
	}

	const votesByKey: Record<string, VoteValue> = {};
	for (const item of votes) {
		if (ALLOWED_VOTES.includes(item.vote as VoteValue)) {
			votesByKey[`${item.topic_id}:${item.participant_country_id}`] = item.vote as VoteValue;
		}
	}

	return {
		events: context.events,
		committees: context.committees,
		selectedEventId: context.selectedEventId,
		selectedParticipantCommitteeId: context.selectedParticipantCommitteeId,
		topics: topics.map((topic) => ({
			id: topic.id,
			topic: topic.topic ?? 0,
			description: topic.description ?? ''
		})),
		participantCountries: participantCountries.map((country) => ({
			id: country.id,
			countryName:
				firstOrNull(country.countries)?.name_english ||
				firstOrNull(country.countries)?.name_spanish ||
				firstOrNull(country.countries)?.name_french ||
				'Unnamed country'
		})),
		votesByKey
	};
};

export const actions: Actions = {
	upsertVote: async ({ request, locals }) => {
		requireUser(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseRequiredUuid(
			formData.get('participantCommitteeId'),
			'Participant committee id'
		);
		const topicId = parseRequiredUuid(formData.get('topicId'), 'Topic id');
		const participantCountryId = parseRequiredUuid(
			formData.get('participantCountryId'),
			'Participant country id'
		);
		const vote = parseRequiredString(formData.get('vote'), 'Vote').toLowerCase();

		if (!ALLOWED_VOTES.includes(vote as VoteValue)) {
			return fail(400, { message: 'Vote must be yes, no, or abstain.' });
		}

		const committee = await assertParticipantCommitteeAccess(locals, participantCommitteeId);
		if (committee.eventId !== eventId) {
			return fail(400, { message: 'Event and participant committee do not match.' });
		}

		const [topicResult, participantCountryResult] = await Promise.all([
			locals.supabase
				.from('topics')
				.select('id')
				.eq('id', topicId)
				.eq('participant_committee_id', participantCommitteeId)
				.maybeSingle(),
			locals.supabase
				.from('participant_countries')
				.select('id')
				.eq('id', participantCountryId)
				.eq('participant_committee_id', participantCommitteeId)
				.maybeSingle()
		]);

		if (topicResult.error || !topicResult.data) {
			return fail(404, { message: 'Topic was not found for this committee.' });
		}

		if (participantCountryResult.error || !participantCountryResult.data) {
			return fail(404, { message: 'Participant country was not found for this committee.' });
		}

		const { data: existingVote, error: existingVoteError } = await locals.supabase
			.from('votes')
			.select('id')
			.eq('topic_id', topicId)
			.eq('participant_country_id', participantCountryId)
			.order('id', { ascending: true })
			.limit(1)
			.maybeSingle();

		if (existingVoteError) {
			return fail(500, { message: existingVoteError.message });
		}

		if (existingVote) {
			const { error } = await locals.supabase
				.from('votes')
				.update({ vote })
				.eq('id', existingVote.id);

			if (error) {
				return fail(500, { message: error.message });
			}
		} else {
			const { error } = await locals.supabase.from('votes').insert({
				topic_id: topicId,
				participant_country_id: participantCountryId,
				vote
			});

			if (error) {
				return fail(500, { message: error.message });
			}
		}

		return {
			success: true,
			message: 'Vote updated.'
		};
	}
};
