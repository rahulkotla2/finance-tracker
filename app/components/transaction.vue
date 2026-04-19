<template>
  <div
    class="grid grid-cols-1 gap-3 border-b border-gray-200 py-4 dark:border-gray-800 sm:grid-cols-3 sm:items-center sm:gap-4"
  >
    <div
      class="flex min-w-0 flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div class="flex min-w-0 items-start gap-2 sm:flex-1 sm:items-center">
        <UIcon
          :name="icon"
          :class="[iconColor, 'mt-0.5 size-5 shrink-0 sm:mt-0']"
        />
        <div class="min-w-0 flex-1 break-words leading-snug">
          {{ transaction.description }}
        </div>
      </div>
      <div class="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
        <UBadge color="neutral" variant="outline" v-if="transaction.category">
          {{ transaction.category }}
        </UBadge>
        <UBadge color="neutral" variant="subtle" v-if="showOwnerBadge && ownerLabel">
          {{ ownerLabel }}
        </UBadge>
        <UBadge color="info" variant="subtle" v-if="showGroupBadge && groupName">
          {{ groupName }}
        </UBadge>
      </div>
    </div>
    <div class="flex items-center justify-between gap-3 sm:justify-end sm:gap-2">
      <div class="text-base font-medium tabular-nums sm:font-normal">
        {{ currency }}
      </div>
      <div class="shrink-0">
        <UDropdownMenu :items="items" :popper="{ placement: 'bottom-end' }">
          <UButton
            trailing-icon="i-heroicons-ellipsis-horizontal-solid"
            color="neutral"
            variant="ghost"
            size="md"
            class="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
            :loading="isLoading"
          />
          <TransactionModal
            :transaction="transaction"
            :group-id="transaction.group_id ?? groupId"
            @saved="emit('edited')"
            v-model:isOpen="isOpen"
          />
        </UDropdownMenu>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  transaction: {
    type: Object,
    required: true,
  },
  groupId: {
    type: String,
    default: null,
  },
  showGroupBadge: {
    type: Boolean,
    default: true,
  },
  showOwnerBadge: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["deleted", "edited"]);
const isOpen = ref(false);
const { currency } = useCurrency(props.transaction.amount);
const supabase = useSupabaseClient();

const isIncome = computed(() => props.transaction.type === "Income");
const icon = computed(() =>
  isIncome.value ? "i-heroicons-arrow-up-right-solid" : "i-heroicons-arrow-down-left-solid",
);
const iconColor = computed(() => (isIncome.value ? "text-green-600" : "text-red-600"));
const groupName = computed(() => props.transaction.expense_groups?.name);

const ownerLabel = computed(() => {
  const p = props.transaction.profiles;
  const name = Array.isArray(p) ? p[0]?.full_name : p?.full_name;
  if (name) return name;
  const uid = props.transaction.user_id;
  if (uid && typeof uid === "string") return `…${uid.slice(-6)}`;
  return null;
});

const isLoading = ref(false);
const { toastSuccess, toastError } = useAppToast();

const deleteTransaction = async () => {
  isLoading.value = true;
  try {
    await supabase.from("transactions").delete().eq("id", props.transaction.id);
    toastSuccess({ title: "Transaction deleted" });
    emit("deleted", props.transaction.id);
  } catch (error) {
    toastError({ title: "Error deleting transaction", description: error.message });
  } finally {
    isLoading.value = false;
  }
};

const items = [
  [
    {
      label: "Edit",
      icon: "i-heroicons-pencil-square-20-solid",
      onSelect: () => {
        isOpen.value = true;
      },
    },
    {
      label: "Delete",
      icon: "i-heroicons-trash-20-solid",
      onSelect: deleteTransaction,
    },
  ],
];
</script>