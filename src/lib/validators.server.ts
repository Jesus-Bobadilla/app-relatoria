import { error } from '@sveltejs/kit';

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseOptionalUuid(value: string | null, fieldName = 'id') {
	if (!value) {
		return null;
	}

	if (!UUID_REGEX.test(value)) {
		throw error(400, `${fieldName} must be a valid UUID.`);
	}

	return value;
}

export function parseRequiredUuid(value: FormDataEntryValue | string | null, fieldName = 'id') {
	const uuid = parseOptionalUuid(typeof value === 'string' ? value : null, fieldName);

	if (!uuid) {
		throw error(400, `${fieldName} is required.`);
	}

	return uuid;
}

export function parseRequiredString(
	value: FormDataEntryValue | string | null,
	fieldName: string,
	options: { allowEmpty?: boolean } = {}
) {
	if (typeof value !== 'string') {
		throw error(400, `${fieldName} is required.`);
	}

	const normalized = value.trim();
	if (!options.allowEmpty && !normalized) {
		throw error(400, `${fieldName} is required.`);
	}

	return normalized;
}

export function parseOptionalString(value: FormDataEntryValue | string | null) {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return normalized.length ? normalized : null;
}

export function parseRequiredNumber(
	value: FormDataEntryValue | string | null,
	fieldName: string,
	options: { min?: number } = {}
) {
	if (typeof value !== 'string' || !value.trim()) {
		throw error(400, `${fieldName} is required.`);
	}

	const numericValue = Number(value);
	if (!Number.isFinite(numericValue)) {
		throw error(400, `${fieldName} must be a valid number.`);
	}

	if (options.min !== undefined && numericValue < options.min) {
		throw error(400, `${fieldName} must be greater than or equal to ${options.min}.`);
	}

	return numericValue;
}

export function parseOptionalNumber(value: FormDataEntryValue | string | null) {
	if (typeof value !== 'string' || !value.trim()) {
		return null;
	}

	const numericValue = Number(value);
	if (!Number.isFinite(numericValue)) {
		throw error(400, 'Expected a valid number.');
	}

	return numericValue;
}

export function parseInteger(
	value: FormDataEntryValue | string | null,
	fieldName: string,
	options: { min?: number } = {}
) {
	const numericValue = parseRequiredNumber(value, fieldName, options);
	if (!Number.isInteger(numericValue)) {
		throw error(400, `${fieldName} must be an integer.`);
	}

	return numericValue;
}
