<script lang="ts">
	import { CalendarDays, Pencil, Trash2 } from '@lucide/svelte';

	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	function eventScreenHref(eventId: string) {
		return `/manageEvents/eventScreen?eventId=${eventId}`;
	}

	function editEventHref(eventId: string) {
		return `/createEvent?eventId=${eventId}`;
	}
</script>

<div class="space-y-6 p-8">
	<div class="flex items-center gap-3">
		<div class="rounded-lg bg-primary/10 p-2 text-primary">
			<CalendarDays class="h-6 w-6" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">Manage Events</h1>
			<p class="text-sm text-base-content/70">Browse events and open committee operations.</p>
		</div>
	</div>

	{#if form?.message}
		<div class={`alert ${form.success ? 'alert-success' : 'alert-error'}`}>
			<span>{form.message}</span>
		</div>
	{/if}

	{#if data.events.length === 0}
		<div class="alert">
			<span>No events found. Create your first event to continue.</span>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{#each data.events as event (event.id)}
				<div class="card border border-base-300 bg-base-100 shadow-sm">
					<div class="card-body gap-4">
						<div>
							<h2 class="card-title">{event.eventName}</h2>
							<p class="text-sm text-base-content/70">{event.description || 'No description.'}</p>
						</div>
						<div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
							<div class="rounded-box bg-base-200 p-2">
								<div class="text-xs text-base-content/60">Start date</div>
								<div>{event.startDate ?? 'Not set'}</div>
							</div>
							<div class="rounded-box bg-base-200 p-2">
								<div class="text-xs text-base-content/60">Place</div>
								<div>{event.place || 'Not set'}</div>
							</div>
							<div class="rounded-box bg-base-200 p-2">
								<div class="text-xs text-base-content/60">Participant committees</div>
								<div>{event.participantCommitteeCount}</div>
							</div>
						</div>
						<div class="card-actions justify-end gap-2">
							<a class="btn btn-sm" href={eventScreenHref(event.id)}>Open event screen</a>
							<a class="btn btn-sm btn-primary btn-outline" href={editEventHref(event.id)}>
								<Pencil class="h-4 w-4" />
								Edit
							</a>
							<form method="POST" action="?/deleteEvent">
								<input type="hidden" name="eventId" value={event.id} />
								<button type="submit" class="btn btn-sm btn-error btn-outline">
									<Trash2 class="h-4 w-4" />
									Delete
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
