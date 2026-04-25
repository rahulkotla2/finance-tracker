<template>
  <div
    class="flex gap-3 border-b border-gray-200 py-4 dark:border-gray-800 sm:items-center sm:gap-4"
  >
    <div
      v-if="showSpendPickCheckbox"
      class="flex shrink-0 items-start self-start rounded-md border-2 border-primary-500/70 bg-primary-50/90 p-2 shadow-sm dark:border-primary-400/60 dark:bg-primary-950/60 sm:items-center sm:self-center"
    >
      <UCheckbox
        color="primary"
        size="md"
        :model-value="creditSpendSelected"
        aria-label="Select this card line for combined savings"
        @update:model-value="(v) => emit('toggleCreditSpendSelect', Boolean(v))"
      />
    </div>
    <div
      class="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center sm:gap-4"
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
          v-if="creditLine && showReserveOrPayment"
          :color="ccReserve ? 'success' : 'info'"
          variant="subtle"
        >
          {{ ccReserve ? "reserve" : "payment" }}
        </UBadge>
        <UBadge color="neutral" variant="outline" v-else-if="transaction.category && creditLine && !showReserveOrPayment">
          {{ transaction.category }}
        </UBadge>
        <UBadge color="neutral" variant="outline" v-else-if="!creditLine && transaction.category">
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
            :group-owner-user-id="groupOwnerUserId"
            :credit-card="creditLine"
            :credit-card-id="creditCardId"
            :billing-cycle-key="billingCycleKey"
            :card-billing-cycle-start-day="cardBillingCycleStartDay"
            :card-billing-cycle-end-day="cardBillingCycleEndDay"
            @saved="emit('edited')"
            v-model:isOpen="isOpen"
          />
        </UDropdownMenu>
      </div>
      <div v-else class="shrink-0" aria-hidden="true" />
    </div>
    </div>
  </div>
</template>

<script setup>
import { isCcReserve, isCcPaymentToOwner, isCcSpend } from "~/utils/creditCardTransaction";

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
  /** When editing a credit line from a group, pass through for save payload */
  creditCardId: { type: String, default: null },
  billingCycleKey: { type: String, default: null },
  cardBillingCycleStartDay: { type: [Number, String], default: null },
  cardBillingCycleEndDay: { type: [Number, String], default: null },
  /** Card owner must not add “Payment to owner” (members pay the owner) */
  groupOwnerUserId: { type: String, default: null },
  /**
   * Optional map `user_id` → display name (e.g. from group members) when `profiles` is not on the row.
   */
  memberNamesByUserId: { type: Object, default: null },
  /** Credit card view: when true, show a checkbox on plain card spend rows only. */
  pickSpendForReserveMode: { type: Boolean, default: false },
  creditSpendSelected: { type: Boolean, default: false },
});

const emit = defineEmits(["deleted", "edited", "toggleCreditSpendSelect"]);
const isOpen = ref(false);
const { currency } = useCurrency(props.transaction.amount);
const supabase = useSupabaseClient();

const isIncome = computed(
  () => !props.creditLine && props.transaction.type === "Income",
);

const ccReserve = computed(() => isCcReserve(props.transaction));
const showReserveOrPayment = computed(
  () => ccReserve.value || isCcPaymentToOwner(props.transaction),
);

/** Card spend only — not reserve, not payment-to-owner; any member’s line in this list. */
const showSpendPickCheckbox = computed(() => {
  if (!props.pickSpendForReserveMode || !props.creditLine) return false;
  const t = props.transaction;
  if (isCcReserve(t) || isCcPaymentToOwner(t)) return false;
  return isCcSpend(t);
});

const lineKind = computed(() => {
  if (!props.creditLine) {
    return isIncome.value ? "income" : "out";
  }
  if (isCcReserve(props.transaction)) return "reserve";
  if (isCcPaymentToOwner(props.transaction)) return "settle";
  if (isCcSpend(props.transaction) || props.transaction.type === "Expense")
    return "out";
  if (props.transaction.type === "Income") return "income";
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

function fullNameFromProfiles(p) {
  if (!p) return null;
  if (Array.isArray(p)) return p[0]?.full_name ?? null;
  return p.full_name ?? null;
}

const ownerLabel = computed(() => {
  const fromJoin = fullNameFromProfiles(props.transaction.profiles);
  if (fromJoin) return fromJoin;
  const uid = props.transaction.user_id;
  if (uid && props.memberNamesByUserId && props.memberNamesByUserId[uid]) {
    return props.memberNamesByUserId[uid];
  }
  if (uid && typeof uid === "string") return `Member …${uid.slice(-6)}`;
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