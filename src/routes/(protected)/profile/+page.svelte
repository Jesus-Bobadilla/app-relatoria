<script lang="ts">
	import { CircleUserRound, LogOut } from '@lucide/svelte';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="p-8">
	<div class="card mx-auto w-full max-w-xl border border-base-300 bg-base-100 shadow-sm">
		<div class="card-body gap-6">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-primary/10 p-2 text-primary">
					<CircleUserRound class="h-6 w-6" />
				</div>
				<div>
					<h1 class="text-2xl font-bold">Profile</h1>
					<p class="text-sm text-base-content/70">Current authenticated session information.</p>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
				<div class="rounded-box bg-base-200 p-3">
					<div class="text-xs text-base-content/60">Email</div>
					<div class="break-all">{data.email || 'No email'}</div>
				</div>
				<div class="rounded-box bg-base-200 p-3">
					<div class="text-xs text-base-content/60">Role</div>
					<div>{data.role}</div>
				</div>
				<div class="rounded-box bg-base-200 p-3">
					<div class="text-xs text-base-content/60">Profile ID</div>
					<div>{data.profileId ?? 'Not set'}</div>
				</div>
			</div>

			<form method="POST" action="?/logout">
				<button type="submit" class="btn btn-error btn-outline">
					<LogOut class="h-4 w-4" />
					Logout
				</button>
			</form>
		</div>
	</div>
</div>
