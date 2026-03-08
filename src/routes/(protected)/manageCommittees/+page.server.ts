import { fail } from '@sveltejs/kit';

import { requireAdmin } from '$lib/auth-guards.server';
import { parseRequiredString, parseRequiredUuid } from '$lib/validators.server';

import type { Actions, PageServerLoad } from './$types';

interface CommitteeRow {
	id: string;
	name: string | null;
	acronym: string | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);

	const { data, error } = await locals.supabase
		.from('committees')
		.select('id, name, acronym')
		.order('name', { ascending: true });

	if (error) {
		return {
			committees: []
		};
	}

	return {
		committees: (data ?? []) as CommitteeRow[]
	};
};

export const actions: Actions = {
	createCommittee: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const name = parseRequiredString(formData.get('name'), 'Committee name');
		const acronym = parseRequiredString(formData.get('acronym'), 'Committee acronym', {
			allowEmpty: true
		});

		const { error } = await locals.supabase.from('committees').insert({
			name,
			acronym
		});

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Committee created.'
		};
	},
	updateCommittee: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const id = parseRequiredUuid(formData.get('id'), 'Committee id');
		const name = parseRequiredString(formData.get('name'), 'Committee name');
		const acronym = parseRequiredString(formData.get('acronym'), 'Committee acronym', {
			allowEmpty: true
		});

		const { error } = await locals.supabase
			.from('committees')
			.update({
				name,
				acronym
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Committee updated.'
		};
	},
	deleteCommittee: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const id = parseRequiredUuid(formData.get('id'), 'Committee id');

		const { error } = await locals.supabase.from('committees').delete().eq('id', id);

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Committee deleted.'
		};
	}
};
