<script lang="ts">
	import { CalendarPlus, Save, Trash2, Users } from '@lucide/svelte';

	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	function countryLabel(country: {
		name_english: string | null;
		name_spanish: string | null;
		name_french: string | null;
	}) {
		return country.name_english || country.name_spanish || country.name_french || 'Unnamed country';
	}

	function languageInputValue(language: unknown) {
		if (!language) {
			return '';
		}

		if (typeof language === 'string') {
			return language;
		}

		return JSON.stringify(language);
	}

	function profileLabel(profile: { id: number; auth_id: string; role: string }) {
		return `#${profile.id} - ${profile.role} (${profile.auth_id})`;
	}
</script>

<div class="space-y-6 p-8">
	<div class="flex items-center gap-3">
		<div class="rounded-lg bg-primary/10 p-2 text-primary">
			<CalendarPlus class="h-6 w-6" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">{data.event ? 'Edit Event' : 'Create Event'}</h1>
			<p class="text-sm text-base-content/70">
				Configure event details, participant committees, countries, and topics.
			</p>
		</div>
	</div>

	{#if form?.message}
		<div class={`alert ${form.success ? 'alert-success' : 'alert-error'}`}>
			<span>{form.message}</span>
		</div>
	{/if}

	<div class="card border border-base-300 bg-base-100 shadow-sm">
		<div class="card-body gap-4">
			<h2 class="card-title text-lg">Event Details</h2>
			<form method="POST" action="?/saveEvent" class="grid grid-cols-1 gap-3 md:grid-cols-2">
				{#if data.event}
					<input type="hidden" name="eventId" value={data.event.id} />
				{/if}
				<input
					required
					name="eventName"
					placeholder="Event name"
					value={data.event?.event_name ?? ''}
					class="input input-bordered w-full md:col-span-2"
				/>
				<textarea
					name="description"
					placeholder="Description"
					class="textarea textarea-bordered md:col-span-2"
				>{data.event?.description ?? ''}</textarea>
				<input
					name="startDate"
					type="date"
					value={data.event?.start_date ?? ''}
					class="input input-bordered w-full"
				/>
				<input
					name="place"
					placeholder="Place"
					value={data.event?.place ?? ''}
					class="input input-bordered w-full"
				/>
				<input
					name="logoUrl"
					placeholder="Logo URL"
					value={data.event?.logo_url ?? ''}
					class="input input-bordered w-full md:col-span-2"
				/>
				<div class="md:col-span-2">
					<button type="submit" class="btn btn-primary">
						<Save class="h-4 w-4" />
						{data.event ? 'Save event changes' : 'Create event'}
					</button>
				</div>
			</form>
		</div>
	</div>

	{#if !data.event}
		<div class="alert alert-info">
			<span>Create the event first, then configure participant committees and topics.</span>
		</div>
	{:else}
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-4">
				<h2 class="card-title text-lg">Add Participant Committee</h2>
				<form method="POST" action="?/saveParticipantCommittee" class="space-y-4">
					<input type="hidden" name="eventId" value={data.event.id} />
					<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
						<select required name="committeeId" class="select select-bordered w-full">
							<option value="" disabled selected>Select committee</option>
							{#each data.committees as committee (committee.id)}
								<option value={committee.id}>
									{committee.name}{committee.acronym ? ` (${committee.acronym})` : ''}
								</option>
							{/each}
						</select>
						<select required name="profileId" class="select select-bordered w-full">
							<option value="" disabled selected>Select profile</option>
							{#each data.profiles as profile (profile.id)}
								<option value={profile.id}>{profileLabel(profile)}</option>
							{/each}
						</select>
						<input
							required
							type="number"
							name="meetings"
							value="1"
							min="1"
							class="input input-bordered w-full"
						/>
					</div>
					<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
						<input name="president" placeholder="President" class="input input-bordered w-full" />
						<input
							name="viceprecident"
							placeholder="Vice president"
							class="input input-bordered w-full"
						/>
						<input name="relatoria" placeholder="Relatoria" class="input input-bordered w-full" />
					</div>
					<input
						name="language"
						placeholder="Language (JSON or text, e.g. code: en)"
						class="input input-bordered w-full"
					/>
					<div>
						<h3 class="mb-2 text-sm font-semibold">Countries</h3>
						<div class="grid max-h-48 grid-cols-1 gap-1 overflow-auto rounded-box border border-base-300 p-3 md:grid-cols-2 lg:grid-cols-3">
							{#each data.countries as country (country.id)}
								<label class="label cursor-pointer justify-start gap-2 py-1">
									<input
										type="checkbox"
										name="countryIds"
										value={country.id}
										class="checkbox checkbox-sm"
									/>
									<span class="label-text">{countryLabel(country)}</span>
								</label>
							{/each}
						</div>
					</div>
					<div>
						<button type="submit" class="btn btn-primary">
							<Users class="h-4 w-4" />
							Save participant committee
						</button>
					</div>
				</form>
			</div>
		</div>

		<div class="space-y-4">
			<h2 class="text-xl font-semibold">Participant Committees ({data.participantCommittees.length})</h2>
			{#if data.participantCommittees.length === 0}
				<div class="alert">
					<span>No participant committees configured yet.</span>
				</div>
			{:else}
				{#each data.participantCommittees as participantCommittee (participantCommittee.id)}
					<div class="card border border-base-300 bg-base-100 shadow-sm">
						<div class="card-body gap-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div>
									<h3 class="card-title text-lg">
										{participantCommittee.committees?.name ?? 'Unnamed committee'}
										{participantCommittee.committees?.acronym
											? ` (${participantCommittee.committees?.acronym})`
											: ''}
									</h3>
									<p class="text-xs text-base-content/70">
										Participant committee ID: {participantCommittee.id}
									</p>
								</div>
								<a
									href={`/manageEvents/eventScreen?eventId=${data.event.id}&participantCommitteeId=${participantCommittee.id}`}
									class="btn btn-sm"
								>
									Open event screen
								</a>
							</div>

							<form method="POST" action="?/saveParticipantCommittee" class="space-y-3">
								<input type="hidden" name="eventId" value={data.event.id} />
								<input
									type="hidden"
									name="participantCommitteeId"
									value={participantCommittee.id}
								/>
								<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
									<select required name="committeeId" class="select select-bordered w-full">
										{#each data.committees as committee (committee.id)}
											<option
												value={committee.id}
												selected={committee.id === participantCommittee.committee_id}
											>
												{committee.name}{committee.acronym ? ` (${committee.acronym})` : ''}
											</option>
										{/each}
									</select>
									<select required name="profileId" class="select select-bordered w-full">
										{#each data.profiles as profile (profile.id)}
											<option
												value={profile.id}
												selected={profile.id === participantCommittee.profiles_id}
											>
												{profileLabel(profile)}
											</option>
										{/each}
									</select>
									<input
										required
										type="number"
										name="meetings"
										value={participantCommittee.meetings ?? 1}
										min="1"
										class="input input-bordered w-full"
									/>
								</div>
								<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
									<input
										name="president"
										value={participantCommittee.president ?? ''}
										placeholder="President"
										class="input input-bordered w-full"
									/>
									<input
										name="viceprecident"
										value={participantCommittee.viceprecident ?? ''}
										placeholder="Vice president"
										class="input input-bordered w-full"
									/>
									<input
										name="relatoria"
										value={participantCommittee.relatoria ?? ''}
										placeholder="Relatoria"
										class="input input-bordered w-full"
									/>
								</div>
								<input
									name="language"
									value={languageInputValue(participantCommittee.language)}
									placeholder="Language (JSON or text, e.g. code: en)"
									class="input input-bordered w-full"
								/>

								<div class="flex flex-wrap gap-2">
									<button type="submit" class="btn btn-sm btn-primary">
										<Save class="h-4 w-4" />
										Save committee
									</button>
									<button
										type="submit"
										formaction="?/deleteParticipantCommittee"
										class="btn btn-sm btn-error btn-outline"
									>
										<Trash2 class="h-4 w-4" />
										Delete committee
									</button>
								</div>
							</form>

							<div class="divider my-1">Countries</div>
							<form method="POST" action="?/saveParticipantCountries" class="space-y-3">
								<input type="hidden" name="eventId" value={data.event.id} />
								<input
									type="hidden"
									name="participantCommitteeId"
									value={participantCommittee.id}
								/>
								<div class="grid max-h-48 grid-cols-1 gap-1 overflow-auto rounded-box border border-base-300 p-3 md:grid-cols-2 lg:grid-cols-3">
									{#each data.countries as country (country.id)}
										{@const selected =
											(participantCommittee.participant_countries ?? []).some(
												(entry) => entry.country_id === country.id
											)}
										<label class="label cursor-pointer justify-start gap-2 py-1">
											<input
												type="checkbox"
												name="countryIds"
												value={country.id}
												class="checkbox checkbox-sm"
												checked={selected}
											/>
											<span class="label-text">{countryLabel(country)}</span>
										</label>
									{/each}
								</div>
								<button type="submit" class="btn btn-sm">Save countries</button>
							</form>

							<div class="divider my-1">Topics</div>
							<form method="POST" action="?/saveTopic" class="grid grid-cols-1 gap-2 md:grid-cols-4">
								<input type="hidden" name="eventId" value={data.event.id} />
								<input
									type="hidden"
									name="participantCommitteeId"
									value={participantCommittee.id}
								/>
								<input
									required
									type="number"
									name="topicNumber"
									min="1"
									placeholder="Topic #"
									class="input input-bordered input-sm"
								/>
								<input
									name="description"
									placeholder="Topic description"
									class="input input-bordered input-sm md:col-span-2"
								/>
								<button type="submit" class="btn btn-sm btn-primary">Add topic</button>
							</form>

							{#if (participantCommittee.topics ?? []).length === 0}
								<p class="text-sm text-base-content/70">No topics defined yet.</p>
							{:else}
								<div class="space-y-2">
									{#each participantCommittee.topics ?? [] as topic (topic.id)}
										<form
											method="POST"
											action="?/saveTopic"
											class="grid grid-cols-1 gap-2 rounded-box border border-base-300 p-2 md:grid-cols-4"
										>
											<input type="hidden" name="eventId" value={data.event.id} />
											<input
												type="hidden"
												name="participantCommitteeId"
												value={participantCommittee.id}
											/>
											<input type="hidden" name="topicId" value={topic.id} />
											<input
												required
												type="number"
												name="topicNumber"
												min="1"
												value={topic.topic ?? 1}
												class="input input-bordered input-sm"
											/>
											<input
												name="description"
												value={topic.description ?? ''}
												class="input input-bordered input-sm md:col-span-2"
											/>
											<div class="flex gap-2">
												<button type="submit" class="btn btn-sm btn-primary">Save</button>
												<button
													type="submit"
													formaction="?/deleteTopic"
													class="btn btn-sm btn-error btn-outline"
												>
													Delete
												</button>
											</div>
										</form>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>
