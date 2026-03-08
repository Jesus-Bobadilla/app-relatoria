<script lang="ts">
	import { Flag, Plus, Save, Trash2 } from '@lucide/svelte';

	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<div class="space-y-6 p-8">
	<div class="flex items-center gap-3">
		<div class="rounded-lg bg-primary/10 p-2 text-primary">
			<Flag class="h-6 w-6" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">Manage Countries</h1>
			<p class="text-sm text-base-content/70">Create, update, and delete countries used across events.</p>
		</div>
	</div>

	{#if form?.message}
		<div class={`alert ${form.success ? 'alert-success' : 'alert-error'}`}>
			<span>{form.message}</span>
		</div>
	{/if}

	<div class="card border border-base-300 bg-base-100 shadow-sm">
		<div class="card-body gap-4">
			<h2 class="card-title text-lg">Add Country</h2>
			<form method="POST" action="?/createCountry" class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
				<input
					required
					name="nameEnglish"
					placeholder="English name"
					class="input input-bordered w-full"
				/>
				<input name="nameSpanish" placeholder="Spanish name" class="input input-bordered w-full" />
				<input name="nameFrench" placeholder="French name" class="input input-bordered w-full" />
				<input name="flagUrl" placeholder="Flag image URL" class="input input-bordered w-full" />
				<div class="md:col-span-2 lg:col-span-4">
					<button type="submit" class="btn btn-primary">
						<Plus class="h-4 w-4" />
						Create country
					</button>
				</div>
			</form>
		</div>
	</div>

	<div class="card border border-base-300 bg-base-100 shadow-sm">
		<div class="card-body">
			<h2 class="card-title text-lg">Countries ({data.countries.length})</h2>
			{#if data.countries.length === 0}
				<div class="alert">
					<span>No countries available yet.</span>
				</div>
			{:else}
				<div class="space-y-3">
					{#each data.countries as country (country.id)}
						<form
							method="POST"
							action="?/updateCountry"
							class="grid grid-cols-1 gap-2 rounded-box border border-base-300 p-3 lg:grid-cols-6"
						>
							<input type="hidden" name="id" value={country.id} />
							<input
								required
								name="nameEnglish"
								value={country.name_english ?? ''}
								class="input input-bordered input-sm w-full"
							/>
							<input
								name="nameSpanish"
								value={country.name_spanish ?? ''}
								class="input input-bordered input-sm w-full"
							/>
							<input
								name="nameFrench"
								value={country.name_french ?? ''}
								class="input input-bordered input-sm w-full"
							/>
							<input
								name="flagUrl"
								value={country.flag_url ?? ''}
								class="input input-bordered input-sm w-full"
							/>
							<div class="flex items-center text-sm text-base-content/70">ID #{country.id}</div>
							<div class="flex flex-wrap items-center gap-2">
								<button type="submit" class="btn btn-sm btn-primary">
									<Save class="h-4 w-4" />
									Save
								</button>
								<button
									type="submit"
									formaction="?/deleteCountry"
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
