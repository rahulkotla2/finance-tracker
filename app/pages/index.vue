<template>
    <section class="flex items-center justify-between mb-10">
        <h1 class="text-4xl font-extrabold">Summary</h1>
        <div>
            <USelectMenu v-model="selectedView" :items="transactionViewOptions" />
        </div>
    </section>
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-16 mb-10">
        <Trend color="green" title="Income" :amount="4000" :last-amount="3000" :loading="pending" />
        <Trend color="red" title="Expense" :amount="4000" :last-amount="5000" :loading="pending" />
        <Trend color="green" title="Investments" :amount="4000" :last-amount="3000" :loading="pending" />
        <Trend color="red" title="Saving" :amount="4000" :last-amount="4100" :loading="pending" />
    </section>

    <section v-if="!pending">
        <div v-for="(transactionsOnDay, date) in transactionGroupedByDate" :key="date">
            <DailyTransactionSummary :date="date" :transactions="transactionsOnDay" :key="date" />
            <Transaction v-for="transaction in transactionsOnDay" :key="transaction.id" :transaction="transaction"
                @deleted="deleteTransaction" />
        </div>
    </section>
    <section v-else>
        <USkeleton class="h-10 w-full mb-2" v-for="i in 4" :key="i" />
    </section>
</template>

<script setup>
import { transactionViewOptions } from '~/constants'
const selectedView = ref('Monthly')

const supabase = useSupabaseClient()

const isLoading = ref(false)

const { data: transactions, pending, refresh: refreshTransactions } = await useAsyncData('transactions', async () => {

    const { data, error } = await supabase
        .from('transactions')
        .select()
    if (error) return []
    return data

})

const transactionGroupedByDate = computed(() => {
    let grouped = {}
    transactions.value?.forEach(transaction => {
        const date = new Date(transaction.created_at).toISOString().split('T')[0]
        if (!grouped[date]) {
            grouped[date] = []
        }
        grouped[date].push(transaction)
    });
    return grouped;
});


const deleteTransaction = async (id) => {
    await refreshTransactions()
}
</script>