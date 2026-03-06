<script lang="ts">
	import { CalendarPlus, CalendarDays, Image, Users } from '@lucide/svelte';

	const cards = [
		{
			title: 'Create Event',
			description: 'Set up a new event with details, schedule, and assignments.',
			icon: CalendarPlus,
			href: '/createEvent'
		},
		{
			title: 'Manage Countries',
			description: 'Upload and organize promotional countries for events.',
			icon: Image,
			href: '/manageCountries'
		},
		{
			title: 'Manage Committees',
			description: 'Oversee committee members, roles, and assignments.',
			icon: Users,
			href: '/manageCommittees'
		},
		{
			title: 'Manage Events',
			description: 'View, edit, and control all existing events.',
			icon: CalendarDays,
			href: '/manageEvents'
		}
	];
</script>

<div class="p-8">
	<h1 class="mb-6 text-2xl font-bold">Portal</h1>
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
