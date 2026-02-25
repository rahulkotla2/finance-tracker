<template>
    <div class="grid grid-cols-2 py-4 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-bold">
        <div class="flex items-center justify-between">
            {{ date }}
        </div>
        <div class="flex items-center justify-end mr-10">
            {{ currency }}
        </div>
    </div>
</template>

<script setup>

const props = defineProps({
    date: {
        type: String,
        required: true
    },
    transactions: {
        type: Array,
        required: true
    }
})

const sum = computed(() => {
    let sum = 0
    
    for(const transaction of props.transactions) {
        transaction.type === 'income' ? sum += transaction.amount : sum -= transaction.amount
    }
    return sum
})

const { currency } = useCurrency(sum)
</script>