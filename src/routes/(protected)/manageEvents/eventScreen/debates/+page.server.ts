import { fail, redirect } from '@sveltejs/kit';

import { requireUser } from '$lib/auth-guards.server';
import {
	assertDebateBelongsToCommittee,
	assertParticipantCountryBelongsToCommittee,
	assertTopicBelongsToCommittee,
	loadDebateSnapshot,
	nowTimeWithTimezone
} from '$lib/debates.server';
import { assertParticipantCommitteeAccess, resolveEventContext } from '$lib/event-context.server';
import { parseInteger, parseRequiredString, parseRequiredUuid } from '$lib/validators.server';

import type { Actions, PageServerLoad } from './$types';

const ALLOWED_STATUSES = ['queued', 'speaking', 'paused', 'done'] as const;
type DebateStatus = (typeof ALLOWED_STATUSES)[number];

export const load: PageServerLoad = async ({ locals, url }) => {
	requireUser(locals);

	const context = await resolveEventContext(locals, url);
	if (!context.selectedEventId || !context.selectedParticipantCommitteeId) {
		return {
			events: context.events,
			committees: context.committees,
			selectedEventId: context.selectedEventId,
			selectedParticipantCommitteeId: context.selectedParticipantCommitteeId,
			snapshot: {
				topics: [],
				participantCountries: [],
				debates: []
			}
		};
	}

	if (
		context.requestedEventId !== context.selectedEventId ||
		context.requestedParticipantCommitteeId !== context.selectedParticipantCommitteeId
	) {
		throw redirect(
			303,
			`/manageEvents/eventScreen/debates?eventId=${context.selectedEventId}&participantCommitteeId=${context.selectedParticipantCommitteeId}`
		);
	}

	const snapshot = await loadDebateSnapshot(locals, context.selectedParticipantCommitteeId);

	return {
		events: context.events,
		committees: context.committees,
		selectedEventId: context.selectedEventId,
		selectedParticipantCommitteeId: context.selectedParticipantCommitteeId,
		snapshot
	};
};

export const actions: Actions = {
	createDebate: async ({ request, locals }) => {
		requireUser(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseRequiredUuid(
			formData.get('participantCommitteeId'),
			'Participant committee id'
		);
		const topicId = parseRequiredUuid(formData.get('topicId'), 'Topic id');

		const committee = await assertParticipantCommitteeAccess(locals, participantCommitteeId);
		if (committee.eventId !== eventId) {
			return fail(400, { message: 'Event and participant committee do not match.' });
		}

		await assertTopicBelongsToCommittee(locals, topicId, participantCommitteeId);

		const { data: existingDebate, error: existingDebateError } = await locals.supabase
			.from('debates')
			.select('id')
			.eq('topic_id', topicId)
			.maybeSingle();

		if (existingDebateError) {
			return fail(500, { message: existingDebateError.message });
		}

		if (existingDebate) {
			return {
				success: true,
				message: 'Debate already exists for this topic.'
			};
		}

		const { error } = await locals.supabase.from('debates').insert({ topic_id: topicId });
		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Debate created.'
		};
	},
	enqueueSpeaker: async ({ request, locals }) => {
		requireUser(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseRequiredUuid(
			formData.get('participantCommitteeId'),
			'Participant committee id'
		);
		const debateId = parseRequiredUuid(formData.get('debateId'), 'Debate id');
		const participantCountryId = parseRequiredUuid(
			formData.get('participantCountryId'),
			'Participant country id'
		);
		const assignedTime = parseInteger(formData.get('assignedTime'), 'Assigned time', { min: 1 });

		const committee = await assertParticipantCommitteeAccess(locals, participantCommitteeId);
		if (committee.eventId !== eventId) {
			return fail(400, { message: 'Event and participant committee do not match.' });
		}

		await assertDebateBelongsToCommittee(locals, debateId, participantCommitteeId);
		await assertParticipantCountryBelongsToCommittee(locals, participantCountryId, participantCommitteeId);

		const { data: existingRows, error: existingRowsError } = await locals.supabase
			.from('debate_order')
			.select('id, order')
			.eq('debate_id', debateId)
			.order('order', { ascending: true });

		if (existingRowsError) {
			return fail(500, { message: existingRowsError.message });
		}

		const maxOrder = Math.max(0, ...((existingRows ?? []).map((item) => item.order ?? 0) as number[]));
		const now = nowTimeWithTimezone();

		const { error } = await locals.supabase.from('debate_order').insert({
			debate_id: debateId,
			participant_country_id: participantCountryId,
			order: maxOrder + 1,
			status: 'queued',
			assigned_time: assignedTime,
			remaining_time: assignedTime,
			started_at: now,
			ended_at: now,
			paused_at: null,
			created_at: now,
			updated_at: now
		});

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Speaker queued.'
		};
	},
	updateDebateOrder: async ({ request, locals }) => {
		requireUser(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseRequiredUuid(
			formData.get('participantCommitteeId'),
			'Participant committee id'
		);
		const debateOrderId = parseRequiredUuid(formData.get('debateOrderId'), 'Debate order id');
		const status = parseRequiredString(formData.get('status'), 'Status').toLowerCase() as DebateStatus;
		const remainingTime = parseInteger(formData.get('remainingTime'), 'Remaining time', { min: 0 });

		if (!ALLOWED_STATUSES.includes(status)) {
			return fail(400, { message: 'Invalid debate status.' });
		}

		const committee = await assertParticipantCommitteeAccess(locals, participantCommitteeId);
		if (committee.eventId !== eventId) {
			return fail(400, { message: 'Event and participant committee do not match.' });
		}

		const { data: debateOrder, error: debateOrderError } = await locals.supabase
			.from('debate_order')
			.select('id, debate_id')
			.eq('id', debateOrderId)
			.maybeSingle();

		if (debateOrderError || !debateOrder) {
			return fail(404, { message: 'Debate order item was not found.' });
		}

		await assertDebateBelongsToCommittee(locals, debateOrder.debate_id, participantCommitteeId);

		const now = nowTimeWithTimezone();
		const payload: Record<string, unknown> = {
			status,
			remaining_time: remainingTime,
			updated_at: now
		};

		if (status === 'speaking') {
			payload.started_at = now;
			payload.paused_at = null;
		}

		if (status === 'paused') {
			payload.paused_at = now;
		}

		if (status === 'done') {
			payload.ended_at = now;
		}

		if (status === 'queued') {
			payload.paused_at = null;
		}

		const { error } = await locals.supabase.from('debate_order').update(payload).eq('id', debateOrderId);
		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Debate order updated.'
		};
	},
	reorderDebateOrder: async ({ request, locals }) => {
		requireUser(locals);

		const formData = await request.formData();
		const eventId = parseRequiredUuid(formData.get('eventId'), 'Event id');
		const participantCommitteeId = parseRequiredUuid(
			formData.get('participantCommitteeId'),
			'Participant committee id'
		);
		const debateOrderId = parseRequiredUuid(formData.get('debateOrderId'), 'Debate order id');
		const newOrder = parseInteger(formData.get('newOrder'), 'New order', { min: 1 });

		const committee = await assertParticipantCommitteeAccess(locals, participantCommitteeId);
		if (committee.eventId !== eventId) {
			return fail(400, { message: 'Event and participant committee do not match.' });
		}

		const { data: debateOrder, error: debateOrderError } = await locals.supabase
			.from('debate_order')
			.select('id, debate_id')
			.eq('id', debateOrderId)
			.maybeSingle();

		if (debateOrderError || !debateOrder) {
			return fail(404, { message: 'Debate order item was not found.' });
		}

		await assertDebateBelongsToCommittee(locals, debateOrder.debate_id, participantCommitteeId);

		const { data: allRowsData, error: allRowsError } = await locals.supabase
			.from('debate_order')
			.select('id, order')
			.eq('debate_id', debateOrder.debate_id)
			.order('order', { ascending: true, nullsFirst: false });

		if (allRowsError) {
			return fail(500, { message: allRowsError.message });
		}

		const rows = [...((allRowsData ?? []) as Array<{ id: string; order: number | null }>)];
		const currentIndex = rows.findIndex((item) => item.id === debateOrderId);
		if (currentIndex === -1) {
			return fail(404, { message: 'Debate order item was not found in the queue.' });
		}

		const [currentRow] = rows.splice(currentIndex, 1);
		const targetIndex = Math.min(Math.max(newOrder - 1, 0), rows.length);
		rows.splice(targetIndex, 0, currentRow);

		const updates = rows.map((item, index) =>
			locals.supabase
				.from('debate_order')
				.update({ order: index + 1, updated_at: nowTimeWithTimezone() })
				.eq('id', item.id)
		);

		const results = await Promise.all(updates);
		const failedResult = results.find((result) => result.error);
		if (failedResult?.error) {
			return fail(500, { message: failedResult.error.message });
		}

		return {
			success: true,
			message: 'Debate order reordered.'
		};
	}
};
