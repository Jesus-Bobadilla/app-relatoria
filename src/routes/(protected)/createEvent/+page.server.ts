import { fail, redirect } from '@sveltejs/kit';

import { requireAdmin } from '$lib/auth-guards.server';
import {
	parseInteger,
	parseOptionalString,
	parseOptionalUuid,
	parseRequiredString,
	parseRequiredUuid
} from '$lib/validators.server';

import type { Actions, PageServerLoad } from './$types';

interface EventRow {
	id: string;
	event_name: string | null;
	description: string | null;
	start_date: string | null;
	place: string | null;
	logo_url: string | null;
}

interface CommitteeOption {
	id: string;
	name: string | null;
	acronym: string | null;
}

interface ProfileOption {
	id: number;
	auth_id: string;
	role: string;
}

interface CountryOption {
	id: number;
	name_english: string | null;
	name_spanish: string | null;
	name_french: string | null;
	flag_url: string | null;
}

interface ParticipantCommitteeRowRaw {
	id: string;
	event_id: string;
	committee_id: string;
	profiles_id: number;
	meetings: number | null;
	language: unknown;
	president: string | null;
	viceprecident: string | null;
	relatoria: string | null;
	committees: {
		id: string;
		name: string | null;
		acronym: string | null;
	} | Array<{ id: string; name: string | null; acronym: string | null }> | null;
	profiles: {
		id: number;
		auth_id: string;
		role: string;
	} | Array<{ id: number; auth_id: string; role: string }> | null;
	participant_countries: Array<{
		id: string;
		country_id: number;
		countries: {
			id: number;
			name_english: string | null;
			name_spanish: string | null;
			name_french: string | null;
			flag_url: string | null;
		} | Array<{
			id: number;
			name_english: string | null;
			name_spanish: string | null;
			name_french: string | null;
			flag_url: string | null;
		}> | null;
	}> | null;
	topics: Array<{
		id: string;
		topic: number | null;
		description: string | null;
	}> | null;
}

interface ParticipantCommitteeRow {
	id: string;
	event_id: string;
	committee_id: string;
	profiles_id: number;
	meetings: number | null;
	language: unknown;
	president: string | null;
	viceprecident: string | null;
	relatoria: string | null;
	committees: {
		id: string;
		name: string | null;
		acronym: string | null;
	} | null;
	profiles: {
		id: number;
		auth_id: string;
		role: string;
	} | null;
	participant_countries: Array<{
		id: string;
		country_id: number;
		countries: {
			id: number;
			name_english: string | null;
			name_spanish: string | null;
			name_french: string | null;
			flag_url: string | null;
		} | null;
	}>;
	topics: Array<{
		id: string;
		topic: number | null;
		description: string | null;
	}>;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
}

function normalizeParticipantCommittee(row: ParticipantCommitteeRowRaw): ParticipantCommitteeRow {
	return {
		id: row.id,
		event_id: row.event_id,
		committee_id: row.committee_id,
		profiles_id: row.profiles_id,
		meetings: row.meetings,
		language: row.language,
		president: row.president,
		viceprecident: row.viceprecident,
		relatoria: row.relatoria,
		committees: firstOrNull(row.committees),
		profiles: firstOrNull(row.profiles),
		participant_countries: (row.participant_countries ?? []).map((participantCountry) => ({
			id: participantCountry.id,
			country_id: participantCountry.country_id,
			countries: firstOrNull(participantCountry.countries)
		})),
		topics: row.topics ?? []
	};
}

async function ensureParticipantCommitteeForEvent(
	locals: App.Locals,
	participantCommitteeId: string,
	eventId: string
) {
	const { data, error } = await locals.supabase
		.from('participant_committee')
		.select('id, event_id')
		.eq('id', participantCommitteeId)
		.eq('event_id', eventId)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	if (!data) {
		throw new Error('Participant committee is not part of the selected event.');
	}

	return data;
}

function normalizeLanguage(rawLanguage: string | null) {
	if (!rawLanguage) {
		return null;
	}

	try {
		return JSON.parse(rawLanguage);
	} catch {
		return { label: rawLanguage };
	}
}

async function replaceParticipantCountries(
	locals: App.Locals,
	participantCommitteeId: string,
	countryIds: number[]
) {
	const { error: deleteError } = await locals.supabase
		.from('participant_countries')
		.delete()
		.eq('participant_committee_id', participantCommitteeId);

	if (deleteError) {
		throw new Error(deleteError.message);
	}

	if (!countryIds.length) {
		return;
	}

	const payload = countryIds.map((countryId) => ({
		participant_committee_id: participantCommitteeId,
		country_id: countryId
	}));

	const { error: insertError } = await locals.supabase.from('participant_countries').insert(payload);

	if (insertError) {
		throw new Error(insertError.message);
	}
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);

	const eventId = parseOptionalUuid(url.searchParams.get('eventId'), 'eventId');

	const [committeesResult, profilesResult, countriesResult] = await Promise.all([
		locals.supabase.from('committees').select('id, name, acronym').order('name', { ascending: true }),
		locals.supabase.from('profiles').select('id, auth_id, role').order('id', { ascending: true }),
		locals.supabase
			.from('countries')
			.select('id, name_english, name_spanish, name_french, flag_url')
			.order('name_english', { ascending: true })
	]);

	if (committeesResult.error || profilesResult.error || countriesResult.error) {
		return {
			eventId,
			event: null,
			committees: [],
			profiles: [],
			countries: [],
			participantCommittees: []
		};
	}

	let event: EventRow | null = null;
	let participantCommittees: ParticipantCommitteeRow[] = [];

	if (eventId) {
		const [eventResult, participantCommitteesResult] = await Promise.all([
			locals.supabase
				.from('events')
				.select('id, event_name, description, start_date, place, logo_url')
				.eq('id', eventId)
				.maybeSingle(),
			locals.supabase
				.from('participant_committee')
				.select(
					'id, event_id, committee_id, profiles_id, meetings, language, president, viceprecident, relatoria, committees(id, name, acronym), profiles(id, auth_id, role), participant_countries(id, country_id, countries(id, name_english, name_spanish, name_french, flag_url)), topics(id, topic, description)'
				)
				.eq('event_id', eventId)
				.order('id', { ascending: true })
		]);

		if (eventResult.error) {
			return {
				eventId,
				event: null,
				committees: (committeesResult.data ?? []) as CommitteeOption[],
				profiles: (profilesResult.data ?? []) as ProfileOption[],
				countries: (countriesResult.data ?? []) as CountryOption[],
				participantCommittees: []
			};
		}

		event = (eventResult.data as EventRow | null) ?? null;

		if (!participantCommitteesResult.error) {
			participantCommittees = ((participantCommitteesResult.data ?? []) as unknown as ParticipantCommitteeRowRaw[]).map(
				normalizeParticipantCommittee
			);
		}
	}

	return {
		eventId,
		event,
		committees: (committeesResult.data ?? []) as CommitteeOption[],
		profiles: (profilesResult.data ?? []) as ProfileOption[],
		countries: (countriesResult.data ?? []) as CountryOption[],
		participantCommittees
	};
};

export const actions: Actions = {
	saveEvent: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const eventId = parseOptionalUuid(
			typeof formData.get('eventId') === 'string' ? (formData.get('eventId') as string) : null,
			'eventId'
		);
		const eventName = parseRequiredString(formData.get('eventName'), 'Event name');
		const description = parseOptionalString(formData.get('description'));
		const startDate = parseOptionalString(formData.get('startDate'));
		const place = parseOptionalString(formData.get('place'));
		const logoUrl = parseOptionalString(formData.get('logoUrl'));

		if (eventId) {
			const { error } = await locals.supabase
				.from('events')
				.update({
					event_name: eventName,
					description: description ?? '',
					start_date: startDate,
					place: place ?? '',
					logo_url: logoUrl ?? ''
				})
				.eq('id', eventId);

			if (error) {
				return fail(500, { message: error.message });
			}

			throw redirect(303, `/createEvent?eventId=${eventId}`);
		}

		const { data, error } = await locals.supabase
			.from('events')
			.insert({
				event_name: eventName,
				description: description ?? '',
				start_date: startDate,
				place: place ?? '',
				logo_url: logoUrl ?? ''
			})
			.select('id')
			.single();

		if (error || !data) {
			return fail(500, { message: error?.message ?? 'Unable to create event.' });
		}

		throw redirect(303, `/createEvent?eventId=${data.id}`);
	},
	saveParticipantCommittee: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseOptionalUuid(
			typeof formData.get('participantCommitteeId') === 'string'
				? (formData.get('participantCommitteeId') as string)
				: null,
			'Participant committee id'
		);
		const committeeId = parseRequiredUuid(formData.get('committeeId'), 'Committee id');
		const profileId = parseInteger(formData.get('profileId'), 'Profile id', { min: 1 });
		const meetings = parseInteger(formData.get('meetings'), 'Meetings', { min: 1 });
		const president = parseOptionalString(formData.get('president'));
		const viceprecident = parseOptionalString(formData.get('viceprecident'));
		const relatoria = parseOptionalString(formData.get('relatoria'));
		const languageValue = parseOptionalString(formData.get('language'));
		const language = normalizeLanguage(languageValue);

		const countryIds = Array.from(
			new Set(
				formData
					.getAll('countryIds')
					.map((entry) => (typeof entry === 'string' ? Number(entry) : Number.NaN))
					.filter((value) => Number.isInteger(value) && value > 0)
			)
		) as number[];

		try {
			if (participantCommitteeId) {
				await ensureParticipantCommitteeForEvent(locals, participantCommitteeId, eventId);

				const { error } = await locals.supabase
					.from('participant_committee')
					.update({
						committee_id: committeeId,
						profiles_id: profileId,
						meetings,
						language,
						president: president ?? '',
						viceprecident: viceprecident ?? '',
						relatoria: relatoria ?? ''
					})
					.eq('id', participantCommitteeId)
					.eq('event_id', eventId);

				if (error) {
					return fail(500, { message: error.message });
				}

				await replaceParticipantCountries(locals, participantCommitteeId, countryIds);
				return {
					success: true,
					message: 'Participant committee updated.'
				};
			}

			const { data, error } = await locals.supabase
				.from('participant_committee')
				.insert({
					event_id: eventId,
					committee_id: committeeId,
					profiles_id: profileId,
					meetings,
					language,
					president: president ?? '',
					viceprecident: viceprecident ?? '',
					relatoria: relatoria ?? ''
				})
				.select('id')
				.single();

			if (error || !data) {
				return fail(500, { message: error?.message ?? 'Unable to create participant committee.' });
			}

			await replaceParticipantCountries(locals, data.id, countryIds);

			return {
				success: true,
				message: 'Participant committee created.'
			};
		} catch (caughtError) {
			return fail(500, {
				message: caughtError instanceof Error ? caughtError.message : 'Unable to save participant committee.'
			});
		}
	},
	deleteParticipantCommittee: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseRequiredUuid(
			formData.get('participantCommitteeId'),
			'Participant committee id'
		);

		try {
			await ensureParticipantCommitteeForEvent(locals, participantCommitteeId, eventId);
		} catch (caughtError) {
			return fail(400, {
				message:
					caughtError instanceof Error
						? caughtError.message
						: 'Participant committee is not part of the selected event.'
			});
		}

		const { error } = await locals.supabase
			.from('participant_committee')
			.delete()
			.eq('id', participantCommitteeId)
			.eq('event_id', eventId);

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Participant committee deleted.'
		};
	},
	saveParticipantCountries: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseRequiredUuid(
			formData.get('participantCommitteeId'),
			'Participant committee id'
		);
		const countryIds = Array.from(
			new Set(
				formData
					.getAll('countryIds')
					.map((entry) => (typeof entry === 'string' ? Number(entry) : Number.NaN))
					.filter((value) => Number.isInteger(value) && value > 0)
			)
		) as number[];

		try {
			await ensureParticipantCommitteeForEvent(locals, participantCommitteeId, eventId);
			await replaceParticipantCountries(locals, participantCommitteeId, countryIds);
			return {
				success: true,
				message: 'Participant countries updated.'
			};
		} catch (caughtError) {
			return fail(500, {
				message: caughtError instanceof Error ? caughtError.message : 'Unable to save participant countries.'
			});
		}
	},
	saveTopic: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseRequiredUuid(
			formData.get('participantCommitteeId'),
			'Participant committee id'
		);
		const topicId = parseOptionalUuid(
			typeof formData.get('topicId') === 'string' ? (formData.get('topicId') as string) : null,
			'Topic id'
		);
		const topicNumber = parseInteger(formData.get('topicNumber'), 'Topic number', { min: 1 });
		const description = parseOptionalString(formData.get('description'));

		try {
			await ensureParticipantCommitteeForEvent(locals, participantCommitteeId, eventId);
		} catch (caughtError) {
			return fail(400, {
				message:
					caughtError instanceof Error
						? caughtError.message
						: 'Participant committee is not part of the selected event.'
			});
		}

		if (topicId) {
			const { error } = await locals.supabase
				.from('topics')
				.update({
					topic: topicNumber,
					description: description ?? ''
				})
				.eq('id', topicId)
				.eq('participant_committee_id', participantCommitteeId);

			if (error) {
				return fail(500, { message: error.message });
			}

			return {
				success: true,
				message: 'Topic updated.'
			};
		}

		const { error } = await locals.supabase.from('topics').insert({
			participant_committee_id: participantCommitteeId,
			topic: topicNumber,
			description: description ?? ''
		});

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Topic created.'
		};
	},
	deleteTopic: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseRequiredUuid(
			formData.get('participantCommitteeId'),
			'Participant committee id'
		);
		const topicId = parseRequiredUuid(formData.get('topicId'), 'Topic id');

		try {
			await ensureParticipantCommitteeForEvent(locals, participantCommitteeId, eventId);
		} catch (caughtError) {
			return fail(400, {
				message:
					caughtError instanceof Error
						? caughtError.message
						: 'Participant committee is not part of the selected event.'
			});
		}

		const { error } = await locals.supabase
			.from('topics')
			.delete()
			.eq('id', topicId)
			.eq('participant_committee_id', participantCommitteeId);

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Topic deleted.'
		};
	}
};
