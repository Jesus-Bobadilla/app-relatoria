import { error } from '@sveltejs/kit';

import { assertParticipantCommitteeAccess } from '$lib/event-context.server';

export type DebateStatus = 'queued' | 'speaking' | 'paused' | 'done';

export interface DebateTopic {
	id: string;
	topic: number;
	description: string;
}

export interface DebateCountry {
	id: string;
	countryId: number;
	nameEnglish: string;
	nameSpanish: string;
	nameFrench: string;
	flagUrl: string;
}

export interface DebateOrderItem {
	id: string;
	debateId: string;
	participantCountryId: string;
	order: number;
	status: string;
	assignedTime: number;
	remainingTime: number;
	startedAt: string;
	endedAt: string;
	pausedAt: string | null;
	updatedAt: string | null;
	country: DebateCountry | null;
}

export interface DebateSnapshot {
	topics: DebateTopic[];
	participantCountries: DebateCountry[];
	debates: Array<{
		id: string;
		topicId: string;
		topicLabel: string;
		orders: DebateOrderItem[];
	}>;
}

interface TopicRow {
	id: string;
	topic: number | null;
	description: string | null;
}

interface ParticipantCountryRow {
	id: string;
	participant_committee_id: string;
	country_id: number;
	countries: {
		name_english: string | null;
		name_spanish: string | null;
		name_french: string | null;
		flag_url: string | null;
	} | Array<{
		name_english: string | null;
		name_spanish: string | null;
		name_french: string | null;
		flag_url: string | null;
	}> | null;
}

interface DebateRow {
	id: string;
	topic_id: string;
}

interface DebateOrderRow {
	id: string;
	debate_id: string;
	participant_country_id: string;
	order: number | null;
	status: string;
	assigned_time: number;
	remaining_time: number;
	started_at: string;
	ended_at: string;
	paused_at: string | null;
	updated_at: string | null;
	participant_countries: ParticipantCountryRow | ParticipantCountryRow[] | null;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
}

export function nowTimeWithTimezone() {
	const now = new Date();
	const hours = String(now.getUTCHours()).padStart(2, '0');
	const minutes = String(now.getUTCMinutes()).padStart(2, '0');
	const seconds = String(now.getUTCSeconds()).padStart(2, '0');
	return `${hours}:${minutes}:${seconds}+00`;
}

function mapCountry(row: ParticipantCountryRow): DebateCountry {
	const countryDetails = firstOrNull(row.countries);

	return {
		id: row.id,
		countryId: row.country_id,
		nameEnglish: countryDetails?.name_english ?? '',
		nameSpanish: countryDetails?.name_spanish ?? '',
		nameFrench: countryDetails?.name_french ?? '',
		flagUrl: countryDetails?.flag_url ?? ''
	};
}

function mapTopic(row: TopicRow): DebateTopic {
	return {
		id: row.id,
		topic: row.topic ?? 0,
		description: row.description ?? ''
	};
}

export async function loadDebateSnapshot(
	locals: App.Locals,
	participantCommitteeId: string
): Promise<DebateSnapshot> {
	await assertParticipantCommitteeAccess(locals, participantCommitteeId);

	const { data: topicsData, error: topicsError } = await locals.supabase
		.from('topics')
		.select('id, topic, description')
		.eq('participant_committee_id', participantCommitteeId)
		.order('topic', { ascending: true });

	if (topicsError) {
		throw error(500, topicsError.message);
	}

	const topics = ((topicsData ?? []) as TopicRow[]).map(mapTopic);
	const topicMap = new Map(topics.map((item) => [item.id, item]));

	const { data: countriesData, error: countriesError } = await locals.supabase
		.from('participant_countries')
		.select(
			'id, participant_committee_id, country_id, countries(name_english, name_spanish, name_french, flag_url)'
		)
		.eq('participant_committee_id', participantCommitteeId)
		.order('country_id', { ascending: true });

	if (countriesError) {
		throw error(500, countriesError.message);
	}

	const participantCountries = ((countriesData ?? []) as unknown as ParticipantCountryRow[]).map(mapCountry);

	if (!topics.length) {
		return {
			topics,
			participantCountries,
			debates: []
		};
	}

	const topicIds = topics.map((item) => item.id);
	const { data: debatesData, error: debatesError } = await locals.supabase
		.from('debates')
		.select('id, topic_id')
		.in('topic_id', topicIds)
		.order('id', { ascending: true });

	if (debatesError) {
		throw error(500, debatesError.message);
	}

	const debatesRows = (debatesData ?? []) as DebateRow[];
	const debateIds = debatesRows.map((item) => item.id);

	let ordersRows: DebateOrderRow[] = [];
	if (debateIds.length > 0) {
		const { data: debateOrderData, error: debateOrderError } = await locals.supabase
			.from('debate_order')
			.select(
				'id, debate_id, participant_country_id, order, status, assigned_time, remaining_time, started_at, ended_at, paused_at, updated_at, participant_countries(id, participant_committee_id, country_id, countries(name_english, name_spanish, name_french, flag_url))'
			)
			.in('debate_id', debateIds)
			.order('order', { ascending: true, nullsFirst: false });

		if (debateOrderError) {
			throw error(500, debateOrderError.message);
		}

		ordersRows = (debateOrderData ?? []) as unknown as DebateOrderRow[];
	}

	const ordersByDebate = new Map<string, DebateOrderItem[]>();
	for (const row of ordersRows) {
		const participantCountry = firstOrNull(row.participant_countries);
		const list = ordersByDebate.get(row.debate_id) ?? [];
		list.push({
			id: row.id,
			debateId: row.debate_id,
			participantCountryId: row.participant_country_id,
			order: row.order ?? 0,
			status: row.status,
			assignedTime: row.assigned_time,
			remainingTime: row.remaining_time,
			startedAt: row.started_at,
			endedAt: row.ended_at,
			pausedAt: row.paused_at,
			updatedAt: row.updated_at,
			country: participantCountry ? mapCountry(participantCountry) : null
		});
		ordersByDebate.set(row.debate_id, list);
	}

	const debates = debatesRows.map((debate) => {
		const topic = topicMap.get(debate.topic_id);
		const topicLabel = topic
			? `Topic ${topic.topic}${topic.description ? `: ${topic.description}` : ''}`
			: debate.topic_id;

		const orders = (ordersByDebate.get(debate.id) ?? []).sort((a, b) => a.order - b.order);

		return {
			id: debate.id,
			topicId: debate.topic_id,
			topicLabel,
			orders
		};
	});

	return {
		topics,
		participantCountries,
		debates
	};
}

export async function assertTopicBelongsToCommittee(
	locals: App.Locals,
	topicId: string,
	participantCommitteeId: string
) {
	const { data, error: topicError } = await locals.supabase
		.from('topics')
		.select('id, participant_committee_id')
		.eq('id', topicId)
		.maybeSingle();

	if (topicError) {
		throw error(500, topicError.message);
	}

	if (!data || data.participant_committee_id !== participantCommitteeId) {
		throw error(404, 'Topic was not found for the selected committee.');
	}
}

export async function assertDebateBelongsToCommittee(
	locals: App.Locals,
	debateId: string,
	participantCommitteeId: string
) {
	const { data, error: debateError } = await locals.supabase
		.from('debates')
		.select('id, topic_id, topics(participant_committee_id)')
		.eq('id', debateId)
		.maybeSingle();

	if (debateError) {
		throw error(500, debateError.message);
	}

	const topicRelation = firstOrNull(
		(data?.topics ?? null) as
			| { participant_committee_id: string }
			| Array<{ participant_committee_id: string }>
			| null
	);
	const committeeId = topicRelation?.participant_committee_id ?? null;

	if (!data || committeeId !== participantCommitteeId) {
		throw error(404, 'Debate was not found for the selected committee.');
	}
}

export async function assertParticipantCountryBelongsToCommittee(
	locals: App.Locals,
	participantCountryId: string,
	participantCommitteeId: string
) {
	const { data, error: participantCountryError } = await locals.supabase
		.from('participant_countries')
		.select('id, participant_committee_id')
		.eq('id', participantCountryId)
		.maybeSingle();

	if (participantCountryError) {
		throw error(500, participantCountryError.message);
	}

	if (!data || data.participant_committee_id !== participantCommitteeId) {
		throw error(404, 'Participant country was not found for the selected committee.');
	}
}
