<template>
  <UModal
    v-model:open="isOpen"
    :title="modalTitle"
  >
    <template #body>
      <UForm :state="state" :schema="formSchema" @submit="save" ref="formRef">
        <UFormField
          :label="creditCard ? 'Line type' : 'Transaction Type'"
          name="type"
          :required="true"
          class="mb-4"
        >
          <USelectMenu
            :disabled="isEditing"
            :placeholder="creditCard ? 'What kind of line' : 'Select Transaction Type'"
            v-model="state.type"
            :items="typeMenuItems"
            class="w-full"
          />
        </UFormField>
        <p
          v-if="creditCard"
          class="text-xs text-gray-500 dark:text-gray-400 -mt-1 mb-4"
        >
          <span class="font-medium text-gray-600 dark:text-gray-300">Expense</span> — charge on
          the card. <span class="font-medium text-gray-600 dark:text-gray-300">Reserve</span> —
          add to your savings to repay. <span
            class="font-medium text-gray-600 dark:text-gray-300"
            >Settle</span
          > — partial payment to the card owner.
        </p>

        <UFormField label="Amount" name="amount" :required="true" class="mb-4">
          <UInput v-model.number="state.amount" type="number" placeholder="Amount" class="w-full" />
        </UFormField>

        <UFormField
          :label="creditCard ? 'Transaction date' : 'Transaction Date'"
          name="created_at"
          :required="true"
          class="mb-4"
        >
          <UInput
            icon="i-heroicons-calendar-days-20-solid"
            type="date"
            v-model="state.created_at"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Description" name="description" hint="Optional" class="mb-4">
          <UInput v-model="state.description" type="text" placeholder="Description" class="w-full" />
        </UFormField>

        <UFormField label="Category" name="category" :required="true" class="mb-4" v-if="state.type === 'Expense'">
          <USelectMenu placeholder="Select Category" v-model="state.category" :items="categories" class="w-full" />
        </UFormField>

        <UButton type="submit" color="neutral" label="Save" variant="solid" :loading="isLoading" />
      </UForm>
    </template>
  </UModal>
</template>

<script setup>
import { categories, types, creditCardLineTypes } from "~/constants";
import { z } from "zod";

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  transaction: {
    type: Object,
    required: false,
  },
  groupId: {
    type: String,
    required: false,
    default: null,
  },
  isDemo: {
    type: Boolean,
    default: false,
  },
  /**
   * Credit card: Expense = card use, Reserve = add to savings, Settle = partial to owner.
   * Non-Expense line types are not in the main DB enum yet; use isDemo or migrate DB.
   */
  creditCard: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["saved", "update:isOpen"]);

const creditCard = computed(() => props.creditCard);

const isOpen = computed({
  get: () => props.isOpen,
  set: (value) => {
    emit("update:isOpen", value);
    if (!value) {
      resetForm();
    }
  },
});

const isEditing = computed(() => !!props.transaction);

const typeMenuItems = computed(() => (creditCard.value ? creditCardLineTypes : types));

const modalTitle = computed(() => {
  if (isEditing.value) {
    return creditCard.value ? "Edit credit line" : "Edit Transaction";
  }
  if (creditCard.value) {
    return "Add credit line";
  }
  return "Add Transaction";
});

const defaultSchema = z.object({
  amount: z.number().positive("Amount Needs to be positive"),
  created_at: z.string(),
  description: z.string().optional(),
});

const expenseSchema = z.object({
  type: z.literal("Expense"),
  category: z.enum(categories),
});
const incomeSchema = z.object({ type: z.literal("Income") });
const savingSchema = z.object({ type: z.literal("Saving") });
const investmentSchema = z.object({ type: z.literal("Investment") });

const mainSchema = z.intersection(
  defaultSchema,
  z.discriminatedUnion("type", [expenseSchema, incomeSchema, savingSchema, investmentSchema]),
);

const creditExpense = z.object({
  type: z.literal("Expense"),
  category: z.enum(categories),
});
const creditReserve = z.object({ type: z.literal("Reserve") });
const creditSettle = z.object({ type: z.literal("Settle") });
const creditLineSchema = z.intersection(
  defaultSchema,
  z.discriminatedUnion("type", [creditExpense, creditReserve, creditSettle]),
);

const formSchema = computed(() => (props.creditCard ? creditLineSchema : mainSchema));

const getEmptyState = () => {
  if (props.creditCard) {
    return {
      type: "Expense",
      amount: 0,
      created_at: undefined,
      category: undefined,
      description: undefined,
    };
  }
  return {
    type: undefined,
    amount: 0,
    created_at: undefined,
    category: undefined,
    description: undefined,
  };
};

const getInitialState = () => {
  if (props.transaction) {
    return {
      type: props.transaction.type,
      amount: props.transaction.amount,
      created_at: props.transaction.created_at?.split("T")?.[0] ?? undefined,
      category: props.transaction.category,
      description: props.transaction.description,
    };
  }
  return { ...getEmptyState() };
};

const state = ref(getInitialState());

const resetForm = () => {
  Object.assign(state.value, getInitialState());
  formRef.value?.clear();
};

const formRef = ref();
const isLoading = ref(false);
const { toastSuccess, toastError } = useAppToast();
const supabase = useSupabaseClient();

watch(
  () => [state.value.type, props.creditCard],
  () => {
    if (props.creditCard && state.value.type && state.value.type !== "Expense") {
      state.value.category = undefined;
    }
  },
  { immediate: true },
);

/** Credit card only: re-sync when opening; main flow stays the old open/close/reset only. */
watch(
  () => props.isOpen,
  (open) => {
    if (open && props.creditCard) {
      Object.assign(state.value, getInitialState());
    }
  },
);

const save = async () => {
  if (formRef.value?.errors?.length) return;

  isLoading.value = true;
  try {
    if (props.isDemo) {
      toastSuccess({
        title: "Demo",
        description: "This screen does not save to the server.",
      });
      isOpen.value = false;
      emit("saved", state.value);
      return;
    }
    const groupIdForSave = props.transaction?.group_id ?? props.groupId ?? null;
    const { error } = await supabase
      .from("transactions")
      .upsert({ ...state.value, id: props.transaction?.id, group_id: groupIdForSave });
    if (error) throw error;
    toastSuccess({ title: "Transaction saved" });
    isOpen.value = false;
    emit("saved", state.value);
  } catch (error) {
    toastError({
      title: "Error saving transaction",
      description: error.message,
    });
  } finally {
    isLoading.value = false;
  }
};
</script>
