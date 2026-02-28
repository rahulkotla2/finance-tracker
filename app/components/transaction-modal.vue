<template>
    <UModal v-model:open="isOpen" :title="isEditing ? 'Edit Transaction' : 'Add Transaction'">
        <template #body>
            <UForm :state="state" :schema="schema" @submit="save" ref="formRef">
                <UFormField label="Transaction Type" name="type" :required="true" class="mb-4">
                    <USelectMenu :disabled="isEditing" placeholder="Select Transaction Type" v-model="state.type"
                        :items="types" class="w-full" />
                </UFormField>

                <UFormField label="Amount" name="amount" :required="true" class="mb-4">
                    <UInput v-model.number="state.amount" type="number" placeholder="Amount" class="w-full" />
                </UFormField>

                <UFormField label="Transaction Date" name="created_at" :required="true" class="mb-4">
                    <UInput icon="i-heroicons-calendar-days-20-solid" type="date" v-model="state.created_at"
                        class="w-full" />
                </UFormField>

                <UFormField label="Description" name="description" hint="Optional" class="mb-4">
                    <UInput v-model="state.description" type="text" placeholder="Description" class="w-full" />
                </UFormField>

                <UFormField label="Category" name="category" :required="true" class="mb-4"
                    v-if="state.type === 'Expense'">
                    <USelectMenu placeholder="Select Category" v-model="state.category" :items="categories"
                        class="w-full" />
                </UFormField>

                <UButton type="submit" color="neutral" label="Save" variant="solid" :loading="isLoading" />
            </UForm>
        </template>
    </UModal>
</template>

<script setup>
import { categories, types } from "~/constants";
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
});

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

const emit = defineEmits(["saved", "update:isOpen"]);

const defaultSchema = z.object({
    amount: z.number().positive("Amount Needs to be positive"),
    created_at: z.string(),
    description: z.string().optional(),
});

const expenseSchema = z.object({
    type: z.literal("Expense"),
    category: z.enum(categories),
});
const incomeSchema = z.object({
    type: z.literal("Income"),
});

const savingSchema = z.object({
    type: z.literal("Saving"),
});

const investmentSchema = z.object({
    type: z.literal("Investment"),
});

const schema = z.intersection(
    defaultSchema,
    z.discriminatedUnion("type", [
        expenseSchema,
        incomeSchema,
        savingSchema,
        investmentSchema,
    ]),
);

const initialState = isEditing.value ? {
    type: props.transaction.type,
    amount: props.transaction.amount,
    created_at: props.transaction.created_at.split('T')[0],
    category: props.transaction.category,
    description: props.transaction.description,
} : {
    type: undefined,
    amount: 0,
    created_at: undefined,
    category: undefined,
    description: undefined,
};



const state = ref(
    {
        ...initialState
    }
);


const resetForm = () => {
    Object.assign(state.value, initialState);
    formRef.value.clear();
};

const formRef = ref();
const isLoading = ref(false);
const { toastSuccess, toastError } = useAppToast();
const supabase = useSupabaseClient();

const save = async () => {
    if (formRef.value.errors.length) return;

    isLoading.value = true;
    try {
        const { error } = await supabase
            .from("transactions")
            .upsert({ ...state.value, id: props.transaction?.id });
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
