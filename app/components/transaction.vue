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

const emit = defineEmits(['deleted'])

const { currency } = useCurrency(props.transaction.amount)
const supabase = useSupabaseClient()

const isIncome = computed(() => {
    return props.transaction.type === 'income'
})

const icon = computed(() => {
    return isIncome.value ? 'i-heroicons-arrow-up-right-solid' : 'i-heroicons-arrow-down-left-solid'
})

const iconColor = computed(() => {
    return isIncome.value ? 'text-green-600' : 'text-red-600'
})

const isLoading = ref(false)
const toast = useToast()

const deleteTransaction = async () => {
    isLoading.value = true
    try {
        await supabase
            .from('transactions')
            .delete()
            .eq('id', props.transaction.id)
        toast.add({
            title: 'Transaction deleted',
            icon: 'i-heroicons-check-circle-solid',
            color: 'primary'
        })
        emit('deleted', props.transaction.id)
    } catch (error) {
        toast.add({
            title: 'Error deleting transaction',
            icon: 'i-heroicons-exclamation-circle-solid',
            color: 'error'
        })
    } finally {
        isLoading.value = false
    }
}

const items = [[
    {
        label: 'Edit',
        icon: 'i-heroicons-pencil-square-20-solid',
        onSelect: () => {
            console.log('Edit')
        }
    },
    {
        label: 'Delete',
        icon: 'i-heroicons-trash-20-solid',
        onSelect: deleteTransaction
    }

]]
</script>