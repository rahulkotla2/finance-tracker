<template>

    <UCard>
        <template #header> Siging in...</template>
        <div class="text-center">
            wait a moment while we sign you in...
        </div>
    </UCard>
</template>

<script setup>
useRedirectedIfAuthenticated();

</script>
