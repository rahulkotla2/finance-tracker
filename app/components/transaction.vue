<template>
    <div class="grid grid-cols-3 py-4 border-b border-gray-200 dark:border-gray-800">
    <div class="flex items-center justify-between col-span-2 space-x-4">
            <div class="flex items-center space-x-1">
                <UIcon :name="icon" :class="iconColor" />
                <div>{{ transaction.description }}</div>
            </div>
            <div>
                <UBadge color="neutral" variant="outline" v-if="transaction.category">{{ transaction.category }}
                </UBadge>
            </div>
        </div>
        <div class="flex items-center justify-end space-x-2">
            <div>{{ currency }}</div>
            <div>
                <UDropdownMenu :items="items" :popper="{ placement: 'bottom-start' }">
                    <UButton trailing-icon="i-heroicons-ellipsis-horizontal-solid" color="neutral" variant="ghost"
                        :loading="isLoading" />
                    <TransactionModal :transaction="transaction" @saved="emit('edited')" v-model:isOpen="isOpen" />
                </UDropdownMenu>
            </div>
        </div>
    </div>
</template>

<script setup>

const props = defineProps({
    transaction: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['deleted', 'edited'])
const isOpen = ref(false)
const { currency } = useCurrency(props.transaction.amount)
const supabase = useSupabaseClient()

const isIncome = computed(() => {
    return props.transaction.type === 'Income'
})

const icon = computed(() => {
    return isIncome.value ? 'i-heroicons-arrow-up-right-solid' : 'i-heroicons-arrow-down-left-solid'
})

const iconColor = computed(() => {
    return isIncome.value ? 'text-green-600' : 'text-red-600'
})

const isLoading = ref(false)
const { toastSuccess, toastError } = useAppToast()

const deleteTransaction = async () => {
    isLoading.value = true
    try {
        await supabase
            .from('transactions')
            .delete()
            .eq('id', props.transaction.id)
        toastSuccess({ title: 'Transaction deleted' })
        emit('deleted', props.transaction.id)
    } catch (error) {
        toastError({ title: 'Error deleting transaction', description: error.message })
    } finally {
        isLoading.value = false
    }
}

const items = [[
    {
        label: 'Edit',
        icon: 'i-heroicons-pencil-square-20-solid',
        onSelect: () => {
            isOpen.value = true
        }
    },
    {
        label: 'Delete',
        icon: 'i-heroicons-trash-20-solid',
        onSelect: deleteTransaction
    }

]]
</script>