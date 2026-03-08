<script lang="ts">
	import { Handshake, MessagesSquare, Vote } from '@lucide/svelte';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function withContext(path: string) {
		if (!data.selectedEventId || !data.selectedParticipantCommitteeId) {
			return path;
		}

		return `${path}?eventId=${data.selectedEventId}&participantCommitteeId=${data.selectedParticipantCommitteeId}`;
	}

	const cards = [
		{
			title: 'Assistance',
			description: 'Track attendance and assistance by meeting number.',
			icon: Handshake,
			href: '/manageEvents/eventScreen/assistance'
		},
		{
			title: 'Votes',
			description: 'Capture vote outcomes for each topic and country delegation.',
			icon: Vote,
			href: '/manageEvents/eventScreen/votes'
		},
		{
			title: 'Debates',
			description: 'Manage debate order and real-time speaker status.',
			icon: MessagesSquare,
			href: '/manageEvents/eventScreen/debates'
		}
	];
</script>

<div class="space-y-6 p-8">
	<div>
		<h1 class="text-2xl font-bold">Event Screen</h1>
		<p class="text-sm text-base-content/70">Select an event and participant committee to continue.</p>
	</div>

	{#if data.events.length === 0}
		<div class="alert alert-info">
			<span>No events are available for your profile.</span>
		</div>
	{:else}
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-4">
				<form method="GET" class="grid grid-cols-1 gap-3 md:grid-cols-3">
					<select name="eventId" class="select select-bordered w-full" required>
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
						{#if data.committees.length === 0}
							<option value="">No committee available for this event</option>
						{:else}
							{#each data.committees as committee (committee.id)}
								<option value={committee.id} selected={committee.id === data.selectedParticipantCommitteeId}>
									{committee.committeeName}{committee.committeeAcronym
										? ` (${committee.committeeAcronym})`
										: ''}
								</option>
							{/each}
						{/if}
					</select>
					<button type="submit" class="btn btn-primary">Apply selection</button>
				</form>

				{#if data.selectedEvent && data.selectedCommittee}
					<div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-4">
						<div class="rounded-box bg-base-200 p-3">
							<div class="text-xs text-base-content/60">Event</div>
							<div>{data.selectedEvent.eventName}</div>
						</div>
						<div class="rounded-box bg-base-200 p-3">
							<div class="text-xs text-base-content/60">Committee</div>
							<div>{data.selectedCommittee.committeeName}</div>
						</div>
						<div class="rounded-box bg-base-200 p-3">
							<div class="text-xs text-base-content/60">Participant countries</div>
							<div>{data.participantCountryCount}</div>
						</div>
						<div class="rounded-box bg-base-200 p-3">
							<div class="text-xs text-base-content/60">Topics</div>
							<div>{data.topicsCount}</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each cards as card (card.href)}
				<a
					href={withContext(card.href)}
					class="card border border-base-300 bg-base-100 shadow transition-all duration-200 card-sm hover:bg-base-200 hover:shadow-md"
				>
					<div class="card-body items-start gap-2">
						<div class="rounded-lg bg-primary/10 p-2 text-primary">
							<card.icon class="h-6 w-6" />
						</div>
						<h2 class="card-title text-sm">{card.title}</h2>
						<p class="text-xs text-base-content/70">{card.description}</p>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
