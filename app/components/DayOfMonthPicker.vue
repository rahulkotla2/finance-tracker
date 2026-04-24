<template>
  <div
    class="w-full max-w-[min(20rem,100%)] rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
  >
    <p v-if="title" class="mb-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
      {{ title }}
    </p>
    <div
      class="mb-1.5 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tabular-nums text-gray-400 dark:text-gray-500"
    >
      <span v-for="(h, i) in weekHeader" :key="`w-${i}`" class="py-0.5">{{ h }}</span>
    </div>
    <div class="grid grid-cols-7 gap-1">
      <UButton
        v-for="d in 31"
        :key="d"
        type="button"
        :size="size"
        :color="model === d ? 'primary' : 'neutral'"
        :variant="model === d ? 'solid' : 'outline'"
        class="min-w-0 justify-center font-medium tabular-nums"
        :class="cellClass"
        :aria-pressed="model === d"
        :label="String(d)"
        @click="pick(d)"
      />
    </div>
  </div>
</template>

<script setup>
const model = defineModel({
  type: Number,
  default: 1,
});

function pick(d) {
  model.value = d;
}

defineProps({
  /** Optional very short title above the grid, e.g. "Due day" */
  title: {
    type: String,
    default: "",
  },
  /** Nuxt UI button size */
  size: {
    type: String,
    default: "xs",
  },
});

const weekHeader = ["S", "M", "T", "W", "T", "F", "S"];
const cellClass = "h-8 min-h-8 px-0 sm:h-8";
</script>
