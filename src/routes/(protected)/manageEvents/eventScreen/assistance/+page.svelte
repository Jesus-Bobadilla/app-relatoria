<script lang="ts">
	import { Handshake } from '@lucide/svelte';

	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<div class="space-y-6 p-8">
	<div class="flex items-center gap-3">
		<div class="rounded-lg bg-primary/10 p-2 text-primary">
			<Handshake class="h-6 w-6" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">Assistance</h1>
			<p class="text-sm text-base-content/70">
				Track attendance by meeting for the selected participant committee.
			</p>
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
				<form method="GET" class="grid grid-cols-1 gap-3 md:grid-cols-4">
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
					<input
						type="number"
						name="meetingNumber"
						class="input input-bordered w-full"
						min="1"
						value={data.meetingNumber}
					/>
					<button type="submit" class="btn btn-primary">Apply</button>
				</form>
			</div>
		</div>

		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body">
				<h2 class="card-title text-lg">Delegations ({data.rows.length})</h2>
				{#if data.rows.length === 0}
					<p class="text-sm text-base-content/70">No participant countries found for this committee.</p>
				{:else}
					<div class="space-y-2">
						{#each data.rows as row (row.participantCountryId)}
							<form
								method="POST"
								action="?/upsertAssistance"
								class="grid grid-cols-1 items-center gap-2 rounded-box border border-base-300 p-3 md:grid-cols-5"
							>
								<input type="hidden" name="eventId" value={data.selectedEventId ?? ''} />
								<input
									type="hidden"
									name="participantCommitteeId"
									value={data.selectedParticipantCommitteeId ?? ''}
								/>
								<input type="hidden" name="participantCountryId" value={row.participantCountryId} />
								<input type="hidden" name="meetingNumber" value={data.meetingNumber} />

								<div class="md:col-span-2">
									<div class="font-medium">{row.countryName}</div>
									<div class="text-xs text-base-content/60">{row.participantCountryId}</div>
								</div>
								<select name="assisted" class="select select-bordered select-sm w-full">
									<option value="true" selected={row.assisted}>Assisted</option>
									<option value="false" selected={!row.assisted}>Absent</option>
								</select>
								<button type="submit" class="btn btn-sm btn-primary">Save</button>
								<div class="text-sm {row.assisted ? 'text-success' : 'text-warning'}">
									{row.assisted ? 'Present' : 'Absent'}
								</div>
							</form>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
