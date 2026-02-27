<script>
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-base-200">
	<div class="card w-96 bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="mb-4 card-title text-2xl font-bold">Login</h2>

			<form method="POST" use:enhance>
				<fieldset class="fieldset">
					<label class="fieldset-label" for="username">Username</label>
					<input
						id="username"
						name="username"
						type="text"
						placeholder="Enter your username"
						class="input-bordered input w-full"
						required
					/>
				</fieldset>

				<fieldset class="mt-2 fieldset">
					<label class="fieldset-label" for="password">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						placeholder="Enter your password"
						class="input-bordered input w-full"
						required
					/>
				</fieldset>

				{#if form?.message}
					<p class="mt-3 text-sm text-error">{form.message}</p>
				{/if}

				<div class="mt-6 card-actions">
					<button type="submit" class="btn w-full btn-primary">Submit</button>
				</div>
			</form>
		</div>
	</div>
</div>
