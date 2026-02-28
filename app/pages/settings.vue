<template>

    <div class="grid grid-cols-6 gap-8">
        <UNavigationMenu orientation="vertical" :items="items" class="col-span-2"/>
        <div class="col-span-4">
            <NuxtPage />
        </div>
    </div>
</template>

<script setup>
const items = [[
    {
        label: 'Profile',
        to: '/settings/profile',
    },
    {
        label: 'Avatar',
        to: '/settings/avatar',
    },
    {
        label: 'Settings',
        to: '/settings/settings',
    },
]]

</script>