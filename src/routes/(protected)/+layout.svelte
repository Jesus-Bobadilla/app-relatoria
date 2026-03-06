<script lang="ts">
	import {
		Menu,
		CalendarPlus,
		CalendarDays,
		Image,
		Users,
		House,
		CircleUserRound
	} from '@lucide/svelte';

	let { children } = $props();

	const navItems = [
		{ label: 'Home', icon: House, href: '/portal' },
		{ label: 'Create Event', icon: CalendarPlus, href: '/createEvent' },
		{ label: 'Manage Countries', icon: Image, href: '/manageCountries' },
		{ label: 'Manage Committees', icon: Users, href: '/manageCommittees' },
		{ label: 'Manage Events', icon: CalendarDays, href: '/manageEvents' }
	];
</script>

<div class="navbar bg-base-100 shadow-sm">
	<div class="navbar-start">
		<div class="dropdown-hover dropdown">
			<div tabindex="0" role="button" class="btn btn-ghost" aria-label="Open menu">
				<Menu class="h-5 w-5" />
			</div>
			<ul
				tabindex="-1"
				class="dropdown-content menu z-1 w-64 menu-md rounded-box bg-base-100 p-2 shadow"
			>
				{#each navItems as item (item.href)}
					<li>
						<a href={item.href} class="flex items-center gap-3 py-2 text-sm">
							<item.icon class="h-4 w-4" />
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
	<div class="navbar-center">
		<a href="/portal" class="btn text-xl btn-ghost">Global Muners</a>
	</div>
	<div class="navbar-end">
		<a href="/profile" class="btn btn-circle btn-ghost" aria-label="Profile">
			<CircleUserRound class="h-5 w-5" />
		</a>
	</div>
</div>

{@render children()}
