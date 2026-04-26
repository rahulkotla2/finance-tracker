<template>
  <div class="w-full">
    <UButton
      color="neutral"
      variant="outline"
      trailing-icon="i-heroicons-calendar-days-20-solid"
      block
      :label="model ? `Day ${model}` : 'Choose date'"
      @click="isOpen = true"
    />
    <UModal v-model:open="isOpen" :title="title || 'Select a day'">
      <template #body>
        <div class="mb-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tabular-nums text-gray-400 dark:text-gray-500">
          <span v-for="(h, i) in weekHeader" :key="`w-${i}`" class="py-0.5">{{ h }}</span>
        </div>
        <div class="grid grid-cols-7 gap-2">
          <UButton
            v-for="d in 31"
            :key="d"
            type="button"
            :size="size"
            :color="tempModel === d ? 'primary' : 'neutral'"
            :variant="tempModel === d ? 'solid' : 'soft'"
            class="min-w-0 justify-center font-medium tabular-nums h-8 sm:h-8 px-0"
            :aria-pressed="tempModel === d"
            :label="String(d)"
            @click="pick(d)"
          />
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <UButton label="Cancel" color="neutral" variant="outline" @click="cancel" />
          <UButton label="Confirm" color="primary" variant="solid" @click="save" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
const model = defineModel({
  type: Number,
});

const isOpen = ref(false);
const tempModel = ref(model.value);

watch(isOpen, (val) => {
  if (val) {
    tempModel.value = model.value;
  }
});

function pick(d) {
  tempModel.value = d;
}

function cancel() {
  isOpen.value = false;
}

function save() {
  model.value = tempModel.value;
  isOpen.value = false;
}

defineProps({
  title: {
    type: String,
    default: "",
  },
  size: {
    type: String,
    default: "xs",
  },
});

const weekHeader = ["S", "M", "T", "W", "T", "F", "S"];
</script>
