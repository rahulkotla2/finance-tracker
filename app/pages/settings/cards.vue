<template>
  <div class="text-sm text-gray-500">Redirecting to cards…</div>
</template>

<script setup>
await navigateTo("/cards", { replace: true });
</script>
