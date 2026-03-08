<script lang="ts">
	import { Vote } from '@lucide/svelte';

	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const voteOptions = [
		{ value: 'yes', label: 'Yes' },
		{ value: 'no', label: 'No' },
		{ value: 'abstain', label: 'Abstain' }
	] as const;

	function voteKey(topicId: string, participantCountryId: string) {
		return `${topicId}:${participantCountryId}`;
	}

	function currentVote(topicId: string, participantCountryId: string) {
		return data.votesByKey[voteKey(topicId, participantCountryId)] ?? 'abstain';
	}
</script>

<div class="space-y-6 p-8">
	<div class="flex items-center gap-3">
		<div class="rounded-lg bg-primary/10 p-2 text-primary">
			<Vote class="h-6 w-6" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">Votes</h1>
			<p class="text-sm text-base-content/70">Register votes per topic and delegation.</p>
		</div>
	</div>

	{#if form?.message}
		<div class={`alert ${form.success ? 'alert-success' : 'alert-error'}`}>
			<span>{form.message}</span>
		</div>
	{/if}

	{#if data.events.length === 0}
		<div class="alert alert-info">
			<span>No accessible event context found for your profile.</span>
		</div>
	{:else}
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body">
				<form method="GET" class="grid grid-cols-1 gap-3 md:grid-cols-3">
					<select required name="eventId" class="select select-bordered w-full">
						{#each data.events as event (event.id)}
							<option value={event.id} selected={event.id === data.selectedEventId}>
								{event.eventName}
							</option>
						{/each}
					</select>
					<select
						name="participantCommitteeId"
						class="select select-bordered w-full"
						disabled={data.committees.length === 0}
					>
						{#each data.committees as committee (committee.id)}
							<option value={committee.id} selected={committee.id === data.selectedParticipantCommitteeId}>
								{committee.committeeName}{committee.committeeAcronym
									? ` (${committee.committeeAcronym})`
									: ''}
							</option>
						{/each}
					</select>
					<button type="submit" class="btn btn-primary">Apply</button>
				</form>
			</div>
		</div>

		{#if data.topics.length === 0 || data.participantCountries.length === 0}
			<div class="alert">
				<span>
					Add topics and participant countries to the selected committee before recording votes.
				</span>
			</div>
		{:else}
			<div class="card border border-base-300 bg-base-100 shadow-sm">
				<div class="card-body">
					<h2 class="card-title text-lg">Vote Matrix</h2>
					<div class="overflow-x-auto">
						<table class="table table-zebra table-sm">
							<thead>
								<tr>
									<th>Country</th>
									{#each data.topics as topic (topic.id)}
										<th>
											<div class="font-semibold">Topic {topic.topic}</div>
											<div class="text-xs text-base-content/70">{topic.description || 'No description'}</div>
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each data.participantCountries as country (country.id)}
									<tr>
										<td class="min-w-48">{country.countryName}</td>
										{#each data.topics as topic (topic.id)}
											<td class="min-w-56 align-top">
												<form method="POST" action="?/upsertVote" class="flex gap-2">
													<input type="hidden" name="eventId" value={data.selectedEventId ?? ''} />
													<input
														type="hidden"
														name="participantCommitteeId"
														value={data.selectedParticipantCommitteeId ?? ''}
													/>
													<input type="hidden" name="topicId" value={topic.id} />
													<input type="hidden" name="participantCountryId" value={country.id} />
													<select name="vote" class="select select-bordered select-xs w-full">
														{#each voteOptions as option (option.value)}
															<option
																value={option.value}
																selected={currentVote(topic.id, country.id) === option.value}
															>
																{option.label}
															</option>
														{/each}
													</select>
													<button type="submit" class="btn btn-xs btn-primary">Save</button>
												</form>
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
