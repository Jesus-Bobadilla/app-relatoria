import { fail, redirect } from '@sveltejs/kit';

import { requireUser } from '$lib/auth-guards.server';
import { assertParticipantCommitteeAccess, resolveEventContext } from '$lib/event-context.server';
import { parseInteger, parseRequiredString, parseRequiredUuid } from '$lib/validators.server';

import type { Actions, PageServerLoad } from './$types';

interface ParticipantCountryRow {
	id: string;
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

interface AssistanceRow {
	id: string;
	participant_country_id: string;
	assisted: boolean;
	meeting_number: number;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
}

function parseMeetingNumber(searchParams: URLSearchParams) {
	const raw = searchParams.get('meetingNumber');
	if (!raw) {
		return 1;
	}

	const meetingNumber = Number(raw);
	if (!Number.isInteger(meetingNumber) || meetingNumber < 1) {
		return 1;
	}

	return meetingNumber;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requireUser(locals);

	const meetingNumber = parseMeetingNumber(url.searchParams);
	const context = await resolveEventContext(locals, url);

	if (!context.selectedEventId || !context.selectedParticipantCommitteeId) {
		return {
			meetingNumber,
			events: context.events,
			committees: context.committees,
			selectedEventId: context.selectedEventId,
			selectedParticipantCommitteeId: context.selectedParticipantCommitteeId,
			rows: []
		};
	}

	if (
		context.requestedEventId !== context.selectedEventId ||
		context.requestedParticipantCommitteeId !== context.selectedParticipantCommitteeId ||
		String(meetingNumber) !== (url.searchParams.get('meetingNumber') ?? '1')
	) {
		throw redirect(
			303,
			`/manageEvents/eventScreen/assistance?eventId=${context.selectedEventId}&participantCommitteeId=${context.selectedParticipantCommitteeId}&meetingNumber=${meetingNumber}`
		);
	}

	const { data: countriesData, error: countriesError } = await locals.supabase
		.from('participant_countries')
		.select('id, country_id, countries(name_english, name_spanish, name_french, flag_url)')
		.eq('participant_committee_id', context.selectedParticipantCommitteeId)
		.order('country_id', { ascending: true });

	if (countriesError) {
		return {
			meetingNumber,
			events: context.events,
			committees: context.committees,
			selectedEventId: context.selectedEventId,
			selectedParticipantCommitteeId: context.selectedParticipantCommitteeId,
			rows: []
		};
	}

	const participantCountries = (countriesData ?? []) as unknown as ParticipantCountryRow[];
	const participantCountryIds = participantCountries.map((item) => item.id);

	let assistanceRows: AssistanceRow[] = [];
	if (participantCountryIds.length > 0) {
		const { data: assistanceData, error: assistanceError } = await locals.supabase
			.from('assistance')
			.select('id, participant_country_id, assisted, meeting_number')
			.in('participant_country_id', participantCountryIds)
			.eq('meeting_number', meetingNumber);

		if (!assistanceError) {
			assistanceRows = (assistanceData ?? []) as AssistanceRow[];
		}
	}

	const assistanceMap = new Map(assistanceRows.map((row) => [row.participant_country_id, row]));

	const rows = participantCountries.map((country) => {
		const countryDetails = firstOrNull(country.countries);
		const assistance = assistanceMap.get(country.id);
		return {
			participantCountryId: country.id,
			countryName:
				countryDetails?.name_english ||
				countryDetails?.name_spanish ||
				countryDetails?.name_french ||
				'Unnamed country',
			flagUrl: countryDetails?.flag_url ?? '',
			assisted: assistance?.assisted ?? false
		};
	});

	return {
		meetingNumber,
		events: context.events,
		committees: context.committees,
		selectedEventId: context.selectedEventId,
		selectedParticipantCommitteeId: context.selectedParticipantCommitteeId,
		rows
	};
};

export const actions: Actions = {
	upsertAssistance: async ({ request, locals }) => {
		requireUser(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseRequiredUuid(
			formData.get('participantCommitteeId'),
			'Participant committee id'
		);
		const participantCountryId = parseRequiredUuid(
			formData.get('participantCountryId'),
			'Participant country id'
		);
		const meetingNumber = parseInteger(formData.get('meetingNumber'), 'Meeting number', { min: 1 });
		const assistedInput = parseRequiredString(formData.get('assisted'), 'Assisted value');
		const assisted = assistedInput === 'true';

		if (!['true', 'false'].includes(assistedInput)) {
			return fail(400, { message: 'Assisted must be true or false.' });
		}

		const committee = await assertParticipantCommitteeAccess(locals, participantCommitteeId);
		if (committee.eventId !== eventId) {
			return fail(400, { message: 'Event and participant committee do not match.' });
		}

		const { data: participantCountry, error: participantCountryError } = await locals.supabase
			.from('participant_countries')
			.select('id')
			.eq('id', participantCountryId)
			.eq('participant_committee_id', participantCommitteeId)
			.maybeSingle();

		if (participantCountryError || !participantCountry) {
			return fail(404, { message: 'Participant country was not found for this committee.' });
		}

		const { data: existing, error: existingError } = await locals.supabase
			.from('assistance')
			.select('id')
			.eq('participant_country_id', participantCountryId)
			.eq('meeting_number', meetingNumber)
			.order('id', { ascending: true })
			.limit(1)
			.maybeSingle();

		if (existingError) {
			return fail(500, { message: existingError.message });
		}

		if (existing) {
			const { error } = await locals.supabase
				.from('assistance')
				.update({ assisted })
				.eq('id', existing.id);

			if (error) {
				return fail(500, { message: error.message });
			}
		} else {
			const { error } = await locals.supabase.from('assistance').insert({
				participant_country_id: participantCountryId,
				assisted,
				meeting_number: meetingNumber
			});

			if (error) {
				return fail(500, { message: error.message });
			}
		}

		return {
			success: true,
			message: 'Assistance updated.'
		};
	}
};
