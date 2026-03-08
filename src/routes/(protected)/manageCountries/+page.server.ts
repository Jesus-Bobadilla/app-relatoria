import { fail } from '@sveltejs/kit';

import { requireAdmin } from '$lib/auth-guards.server';
import { parseInteger, parseOptionalString, parseRequiredString } from '$lib/validators.server';

import type { Actions, PageServerLoad } from './$types';

interface CountryRow {
	id: number;
	name_english: string | null;
	name_spanish: string | null;
	name_french: string | null;
	flag_url: string | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);

	const { data, error } = await locals.supabase
		.from('countries')
		.select('id, name_english, name_spanish, name_french, flag_url')
		.order('name_english', { ascending: true });

	if (error) {
		return {
			countries: []
		};
	}

	return {
		countries: (data ?? []) as CountryRow[]
	};
};

export const actions: Actions = {
	createCountry: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const nameEnglish = parseRequiredString(formData.get('nameEnglish'), 'English name');
		const nameSpanish = parseOptionalString(formData.get('nameSpanish'));
		const nameFrench = parseOptionalString(formData.get('nameFrench'));
		const flagUrl = parseOptionalString(formData.get('flagUrl'));

		const { error } = await locals.supabase.from('countries').insert({
			name_english: nameEnglish,
			name_spanish: nameSpanish ?? '',
			name_french: nameFrench ?? '',
			flag_url: flagUrl ?? ''
		});

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Country created.'
		};
	},
	updateCountry: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const id = parseInteger(formData.get('id'), 'Country id', { min: 1 });
		const nameEnglish = parseRequiredString(formData.get('nameEnglish'), 'English name');
		const nameSpanish = parseOptionalString(formData.get('nameSpanish'));
		const nameFrench = parseOptionalString(formData.get('nameFrench'));
		const flagUrl = parseOptionalString(formData.get('flagUrl'));

		const { error } = await locals.supabase
			.from('countries')
			.update({
				name_english: nameEnglish,
				name_spanish: nameSpanish ?? '',
				name_french: nameFrench ?? '',
				flag_url: flagUrl ?? ''
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Country updated.'
		};
	},
	deleteCountry: async ({ request, locals }) => {
		requireAdmin(locals);

		const formData = await request.formData();
		const id = parseInteger(formData.get('id'), 'Country id', { min: 1 });

		const { error } = await locals.supabase.from('countries').delete().eq('id', id);

		if (error) {
			return fail(500, { message: error.message });
		}

		return {
			success: true,
			message: 'Country deleted.'
		};
	}
};
