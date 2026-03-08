<!-- This page can be seen by users and admins -->


<script lang="ts">
	import { Handshake, Vote, MessagesSquare } from '@lucide/svelte';

	const cards = [
		{
			title: 'Assistance',
			description: 'Manage attendance, confirmations, and event participation records.',
			icon: Handshake,
			href: '/manageEvents/eventScreen/assistance'
		},
		{
			title: 'Votes',
			description: 'Review voting sessions, track results, and supervise ballot activity.',
			icon: Vote,
			href: '/manageEvents/eventScreen/votes'
		},
		{
			title: 'Debates',
			description: 'Organize debate sessions, topics, and committee discussion flow.',
			icon: MessagesSquare,
			href: '/manageEvents/eventScreen/debates'
		}
	];
</script>

<div class="p-8">
	<h1 class="mb-6 text-2xl font-bold">Event Screen</h1>
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each cards as card (card.href)}
			<a
				href={card.href}
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
</div>
