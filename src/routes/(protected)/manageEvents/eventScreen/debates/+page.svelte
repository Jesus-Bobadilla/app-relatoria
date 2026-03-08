<script lang="ts">
	import { MessagesSquare, RefreshCw } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import { supabase } from '$lib/supabaseClient';

	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let snapshot = $state<{ topics: typeof data.snapshot.topics; participantCountries: typeof data.snapshot.participantCountries; debates: typeof data.snapshot.debates }>({
		topics: [],
		participantCountries: [],
		debates: []
	});
	let refreshError = $state('');
	let isRefreshing = $state(false);

	const statusOptions = ['queued', 'speaking', 'paused', 'done'] as const;

	function dataEndpointUrl() {
		if (!data.selectedEventId || !data.selectedParticipantCommitteeId) {
			return '';
		}

		const params = new URLSearchParams({
			eventId: data.selectedEventId,
			participantCommitteeId: data.selectedParticipantCommitteeId
		});
		return `/manageEvents/eventScreen/debates/data?${params.toString()}`;
	}

	async function refreshSnapshot() {
		const endpointUrl = dataEndpointUrl();
		if (!endpointUrl || isRefreshing) {
			return;
		}

		isRefreshing = true;
		refreshError = '';

		try {
			const response = await fetch(endpointUrl, {
				headers: {
					accept: 'application/json'
				}
			});

			if (!response.ok) {
				refreshError = 'Unable to refresh debates in realtime.';
				return;
			}

			snapshot = await response.json();
		} catch {
			refreshError = 'Unable to refresh debates in realtime.';
		} finally {
			isRefreshing = false;
		}
	}

	onMount(() => {
		snapshot = data.snapshot;

		if (!data.selectedEventId || !data.selectedParticipantCommitteeId) {
			return;
		}

		const channel = supabase
			.channel(`debates-${data.selectedParticipantCommitteeId}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'debates' },
				() => void refreshSnapshot()
			)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'debate_order' },
				() => void refreshSnapshot()
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	});
</script>

<div class="space-y-6 p-8">
	<div class="flex items-center gap-3">
		<div class="rounded-lg bg-primary/10 p-2 text-primary">
			<MessagesSquare class="h-6 w-6" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">Debates</h1>
			<p class="text-sm text-base-content/70">
				Manage debate sessions, queue speakers, and update status in realtime.
			</p>
		</div>
	</div>

	{#if form?.message}
		<div class={`alert ${form.success ? 'alert-success' : 'alert-error'}`}>
			<span>{form.message}</span>
		</div>
	{/if}

	{#if refreshError}
		<div class="alert alert-warning">
			<span>{refreshError}</span>
		</div>
	{/if}

	{#if data.events.length === 0}
		<div class="alert alert-info">
			<span>No accessible event context found for your profile.</span>
		</div>
	{:else}
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body">
				<form method="GET" data-sveltekit-reload class="grid grid-cols-1 gap-3 md:grid-cols-3">
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

		{#if data.selectedEventId && data.selectedParticipantCommitteeId}
			<div class="card border border-base-300 bg-base-100 shadow-sm">
				<div class="card-body gap-3">
					<div class="flex items-center justify-between">
						<h2 class="card-title text-lg">Debate Sessions</h2>
						<button type="button" class="btn btn-sm" onclick={() => void refreshSnapshot()}>
							<RefreshCw class={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
							Refresh
						</button>
					</div>

					<form method="POST" action="?/createDebate" class="grid grid-cols-1 gap-2 md:grid-cols-4">
						<input type="hidden" name="eventId" value={data.selectedEventId} />
						<input type="hidden" name="participantCommitteeId" value={data.selectedParticipantCommitteeId} />
						<select name="topicId" class="select select-bordered w-full md:col-span-3" required>
							<option value="" disabled selected>Create debate for topic</option>
							{#each snapshot.topics as topic (topic.id)}
								<option value={topic.id}>
									Topic {topic.topic}{topic.description ? `: ${topic.description}` : ''}
								</option>
							{/each}
						</select>
						<button type="submit" class="btn btn-primary">Create debate</button>
					</form>

					{#if snapshot.debates.length === 0}
						<p class="text-sm text-base-content/70">No debates created yet.</p>
					{:else}
						<div class="space-y-4">
							{#each snapshot.debates as debate (debate.id)}
								<div class="rounded-box border border-base-300 p-3">
									<h3 class="font-semibold">{debate.topicLabel}</h3>

									<form method="POST" action="?/enqueueSpeaker" class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
										<input type="hidden" name="eventId" value={data.selectedEventId} />
										<input
											type="hidden"
											name="participantCommitteeId"
											value={data.selectedParticipantCommitteeId}
										/>
										<input type="hidden" name="debateId" value={debate.id} />
										<select name="participantCountryId" class="select select-bordered" required>
											<option value="" disabled selected>Select speaker</option>
											{#each snapshot.participantCountries as country (country.id)}
												<option value={country.id}>{country.nameEnglish || country.nameSpanish || country.nameFrench}</option>
											{/each}
										</select>
										<input
											type="number"
											name="assignedTime"
											class="input input-bordered"
											min="1"
											value="60"
											required
										/>
										<button type="submit" class="btn btn-primary md:col-span-2">Queue speaker</button>
									</form>

									{#if debate.orders.length === 0}
										<p class="mt-3 text-sm text-base-content/70">No speakers queued.</p>
									{:else}
										<div class="mt-3 overflow-x-auto">
											<table class="table table-zebra table-sm">
												<thead>
													<tr>
														<th>Order</th>
														<th>Speaker</th>
														<th>Controls</th>
													</tr>
												</thead>
												<tbody>
													{#each debate.orders as orderItem (orderItem.id)}
														<tr>
															<td>
																<form method="POST" action="?/reorderDebateOrder" class="flex items-center gap-1">
																	<input type="hidden" name="eventId" value={data.selectedEventId} />
																	<input
																		type="hidden"
																		name="participantCommitteeId"
																		value={data.selectedParticipantCommitteeId}
																	/>
																	<input type="hidden" name="debateOrderId" value={orderItem.id} />
																	<input
																		type="number"
																		name="newOrder"
																		class="input input-bordered input-xs w-16"
																		value={orderItem.order}
																		min="1"
																	/>
																	<button type="submit" class="btn btn-xs">Set</button>
																</form>
															</td>
															<td>{orderItem.country?.nameEnglish || orderItem.country?.nameSpanish || orderItem.country?.nameFrench || 'Unknown'}</td>
															<td>
																<form method="POST" action="?/updateDebateOrder" class="flex flex-wrap items-center gap-2">
																	<input type="hidden" name="eventId" value={data.selectedEventId} />
																	<input
																		type="hidden"
																		name="participantCommitteeId"
																		value={data.selectedParticipantCommitteeId}
																	/>
																	<input type="hidden" name="debateOrderId" value={orderItem.id} />
																	<select name="status" class="select select-bordered select-xs w-28">
																		{#each statusOptions as status (status)}
																			<option value={status} selected={orderItem.status === status}>{status}</option>
																		{/each}
																	</select>
																	<input
																		type="number"
																		name="remainingTime"
																		class="input input-bordered input-xs w-20"
																		value={orderItem.remainingTime}
																		min="0"
																	/>
																	<button type="submit" class="btn btn-xs btn-primary">Save</button>
																</form>
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
