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
        <UBadge
          v-if="creditLine && (transaction.type === 'Reserve' || transaction.type === 'Settle')"
          :color="transaction.type === 'Reserve' ? 'success' : 'info'"
          variant="subtle"
        >
          {{ transaction.type }}
        </UBadge>
        <UBadge color="neutral" variant="outline" v-else-if="transaction.category">
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
      <div class="shrink-0" v-if="!isDemo">
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
      <div v-else class="shrink-0" aria-hidden="true" />
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
  isDemo: {
    type: Boolean,
    default: false,
  },
  /**
   * Only the credit card screen uses Reserve/Settle line types. Other pages
   * keep the default Income/Expense/… presentation unchanged.
   */
  creditLine: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["deleted", "edited"]);
const isOpen = ref(false);
const { currency } = useCurrency(props.transaction.amount);
const supabase = useSupabaseClient();

const isIncome = computed(
  () => !props.creditLine && props.transaction.type === "Income",
);

const lineKind = computed(() => {
  if (!props.creditLine) {
    return isIncome.value ? "income" : "out";
  }
  const t = props.transaction.type;
  if (t === "Reserve") return "reserve";
  if (t === "Settle") return "settle";
  if (t === "Income") return "income";
  return "out";
});

const icon = computed(() => {
  if (!props.creditLine) {
    return isIncome.value
      ? "i-heroicons-arrow-up-right-solid"
      : "i-heroicons-arrow-down-left-solid";
  }
  const k = lineKind.value;
  if (k === "income") return "i-heroicons-arrow-up-right-solid";
  if (k === "reserve") return "i-heroicons-banknotes-20-solid";
  if (k === "settle") return "i-heroicons-arrow-uturn-left-20-solid";
  return "i-heroicons-arrow-down-left-20-solid";
});
const iconColor = computed(() => {
  if (!props.creditLine) {
    return isIncome.value ? "text-green-600" : "text-red-600";
  }
  const k = lineKind.value;
  if (k === "out" || k === "expense") return "text-red-600";
  if (k === "settle") return "text-blue-600 dark:text-blue-400";
  return "text-green-600";
});
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