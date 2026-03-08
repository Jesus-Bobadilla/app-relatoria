<script lang="ts">
	import { Plus, Save, Trash2, Users } from '@lucide/svelte';

	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<div class="space-y-6 p-8">
	<div class="flex items-center gap-3">
		<div class="rounded-lg bg-primary/10 p-2 text-primary">
			<Users class="h-6 w-6" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">Manage Committees</h1>
			<p class="text-sm text-base-content/70">Maintain the list of committees available in events.</p>
		</div>
	</div>

	{#if form?.message}
		<div class={`alert ${form.success ? 'alert-success' : 'alert-error'}`}>
			<span>{form.message}</span>
		</div>
	{/if}

	<div class="card border border-base-300 bg-base-100 shadow-sm">
		<div class="card-body gap-4">
			<h2 class="card-title text-lg">Add Committee</h2>
			<form method="POST" action="?/createCommittee" class="grid grid-cols-1 gap-3 md:grid-cols-3">
				<input required name="name" placeholder="Committee name" class="input input-bordered w-full" />
				<input name="acronym" placeholder="Acronym" class="input input-bordered w-full" />
				<div>
					<button type="submit" class="btn btn-primary">
						<Plus class="h-4 w-4" />
						Create committee
					</button>
				</div>
			</form>
		</div>
	</div>

	<div class="card border border-base-300 bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-lg">Committees ({data.committees.length})</h2>
			{#if data.committees.length === 0}
				<div class="alert">
					<span>No committees available yet.</span>
				</div>
			{:else}
				<div class="space-y-3">
					{#each data.committees as committee (committee.id)}
						<form
							method="POST"
							action="?/updateCommittee"
							class="grid grid-cols-1 gap-2 rounded-box border border-base-300 p-3 md:grid-cols-5"
						>
							<input type="hidden" name="id" value={committee.id} />
							<input
								required
								name="name"
								value={committee.name ?? ''}
								class="input input-bordered input-sm w-full md:col-span-2"
							/>
							<input
								name="acronym"
								value={committee.acronym ?? ''}
								class="input input-bordered input-sm w-full"
							/>
							<div class="flex items-center text-sm text-base-content/70">ID #{committee.id}</div>
							<div class="flex flex-wrap items-center gap-2">
								<button type="submit" class="btn btn-sm btn-primary">
									<Save class="h-4 w-4" />
									Save
								</button>
								<button
									type="submit"
									formaction="?/deleteCommittee"
									class="btn btn-sm btn-error btn-outline"
								>
									<Trash2 class="h-4 w-4" />
									Delete
								</button>
							</div>
						</form>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
