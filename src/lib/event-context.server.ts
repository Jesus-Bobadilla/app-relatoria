import { error } from '@sveltejs/kit';

import { isAdminRole, requireProfileId, requireUser } from '$lib/auth-guards.server';
import { parseOptionalUuid } from '$lib/validators.server';

export interface EventSummary {
	id: string;
	eventName: string;
	startDate: string | null;
	place: string | null;
}

export interface ParticipantCommitteeSummary {
	id: string;
	eventId: string;
	committeeId: string;
	profilesId: number;
	meetings: number;
	president: string;
	viceprecident: string;
	relatoria: string;
	language: unknown;
	committeeName: string;
	committeeAcronym: string;
}

export interface EventContext {
	events: EventSummary[];
	committees: ParticipantCommitteeSummary[];
	selectedEventId: string | null;
	selectedParticipantCommitteeId: string | null;
	requestedEventId: string | null;
	requestedParticipantCommitteeId: string | null;
}

interface EventRow {
	id: string;
	event_name: string | null;
	start_date: string | null;
	place: string | null;
}

interface UserEventRow {
	events: EventRow | EventRow[] | null;
}

interface ParticipantCommitteeRow {
	id: string;
	event_id: string;
	committee_id: string;
	profiles_id: number;
	meetings: number | null;
	president: string | null;
	viceprecident: string | null;
	relatoria: string | null;
	language: unknown;
	committees: {
		name: string | null;
		acronym: string | null;
	} | Array<{ name: string | null; acronym: string | null }> | null;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
}

function mapEventRow(row: EventRow): EventSummary {
	return {
		id: row.id,
		eventName: row.event_name ?? 'Untitled event',
		startDate: row.start_date,
		place: row.place
	};
}

function mapParticipantCommitteeRow(row: ParticipantCommitteeRow): ParticipantCommitteeSummary {
	const committee = firstOrNull(row.committees);

	return {
		id: row.id,
		eventId: row.event_id,
		committeeId: row.committee_id,
		profilesId: row.profiles_id,
		meetings: row.meetings ?? 1,
		president: row.president ?? '',
		viceprecident: row.viceprecident ?? '',
		relatoria: row.relatoria ?? '',
		language: row.language,
		committeeName: committee?.name ?? 'Unnamed committee',
		committeeAcronym: committee?.acronym ?? ''
	};
}

async function getAccessibleEvents(locals: App.Locals): Promise<EventSummary[]> {
	if (isAdminRole(locals.role)) {
		const { data, error: eventsError } = await locals.supabase
			.from('events')
			.select('id, event_name, start_date, place')
			.order('start_date', { ascending: false, nullsFirst: false })
			.order('event_name', { ascending: true });

		if (eventsError) {
			throw error(500, eventsError.message);
		}

		return ((data ?? []) as EventRow[]).map(mapEventRow);
	}

	const profileId = requireProfileId(locals);
	const { data, error: membershipsError } = await locals.supabase
		.from('participant_committee')
		.select('events(id, event_name, start_date, place)')
		.eq('profiles_id', profileId);

	if (membershipsError) {
		throw error(500, membershipsError.message);
	}

	const unique = new Map<string, EventSummary>();
	for (const row of (data ?? []) as unknown as UserEventRow[]) {
		const event = firstOrNull(row.events);
		if (event && !unique.has(event.id)) {
			unique.set(event.id, mapEventRow(event));
		}
	}

	return Array.from(unique.values()).sort((a, b) => a.eventName.localeCompare(b.eventName));
}

async function getAccessibleCommittees(
	locals: App.Locals,
	eventId: string
): Promise<ParticipantCommitteeSummary[]> {
	let query = locals.supabase
		.from('participant_committee')
		.select(
			'id, event_id, committee_id, profiles_id, meetings, president, viceprecident, relatoria, language, committees(name, acronym)'
		)
		.eq('event_id', eventId)
		.order('id', { ascending: true });

	if (!isAdminRole(locals.role)) {
		query = query.eq('profiles_id', requireProfileId(locals));
	}

	const { data, error: committeesError } = await query;

	if (committeesError) {
		throw error(500, committeesError.message);
	}

	return ((data ?? []) as unknown as ParticipantCommitteeRow[]).map(mapParticipantCommitteeRow);
}

export async function assertParticipantCommitteeAccess(
	locals: App.Locals,
	participantCommitteeId: string
): Promise<ParticipantCommitteeSummary> {
	requireUser(locals);

	const { data, error: committeeError } = await locals.supabase
		.from('participant_committee')
		.select(
			'id, event_id, committee_id, profiles_id, meetings, president, viceprecident, relatoria, language, committees(name, acronym)'
		)
		.eq('id', participantCommitteeId)
		.maybeSingle();

	if (committeeError) {
		throw error(500, committeeError.message);
	}

	if (!data) {
		throw error(404, 'Participant committee was not found.');
	}

	if (!isAdminRole(locals.role) && data.profiles_id !== requireProfileId(locals)) {
		throw error(403, 'You do not have access to this participant committee.');
	}

	return mapParticipantCommitteeRow(data as unknown as ParticipantCommitteeRow);
}

async function inferEventIdFromCommittee(
	locals: App.Locals,
	participantCommitteeId: string
): Promise<string | null> {
	try {
		const committee = await assertParticipantCommitteeAccess(locals, participantCommitteeId);
		return committee.eventId;
	} catch {
		return null;
	}
}

export async function resolveEventContext(locals: App.Locals, url: URL): Promise<EventContext> {
	requireUser(locals);

	const requestedEventId = parseOptionalUuid(url.searchParams.get('eventId'), 'eventId');
	const requestedParticipantCommitteeId = parseOptionalUuid(
		url.searchParams.get('participantCommitteeId'),
		'participantCommitteeId'
	);

	const events = await getAccessibleEvents(locals);

	let selectedEventId =
		requestedEventId && events.some((item) => item.id === requestedEventId) ? requestedEventId : null;

	if (!selectedEventId && requestedParticipantCommitteeId) {
		selectedEventId = await inferEventIdFromCommittee(locals, requestedParticipantCommitteeId);
	}

	if (!selectedEventId && events.length > 0) {
		selectedEventId = events[0].id;
	}

	const committees = selectedEventId ? await getAccessibleCommittees(locals, selectedEventId) : [];

	const selectedParticipantCommitteeId =
		requestedParticipantCommitteeId && committees.some((item) => item.id === requestedParticipantCommitteeId)
			? requestedParticipantCommitteeId
			: committees[0]?.id ?? null;

	return {
		events,
		committees,
		selectedEventId,
		selectedParticipantCommitteeId,
		requestedEventId,
		requestedParticipantCommitteeId
	};
}
