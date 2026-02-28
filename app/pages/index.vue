<template>
    <section class="flex items-center justify-between mb-10">
        <h1 class="text-4xl font-extrabold">Summary</h1>
        <div>
            <USelectMenu v-model="selectedView" :items="transactionViewOptions" />
        </div>
    </section>
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-16 mb-10">
        <Trend color="green" title="Income" :amount="incomeTotal" :last-amount="previousIncomeTotal"
            :loading="pending" />
        <Trend color="red" title="Expense" :amount="expenseTotal" :last-amount="previousExpenseTotal"
            :loading="pending" />
        <Trend color="green" title="Investments" :amount="investmentTotal" :last-amount="previousInvestmentTotal"
            :loading="pending" />
        <Trend color="red" title="Saving" :amount="savingTotal" :last-amount="previousSavingTotal" :loading="pending" />
    </section>

    <section class="flex justify-between mb-10">
        <div>
            <h2>Transactions</h2>
            <div class="text-gray-500 dark:text-gray-400">
                You have {{ incomeCount }} incomes and {{ expenseCount }} expenses this
                period
            </div>
        </div>
        <div>
            <TransactionModal @saved="refreshData" v-model:isOpen="isOpen" />
            <UButton color="neutral" icon="i-heroicons-plus-circle-solid" variant="outline" label="Add"
                @click="isOpen = true">
                Add
            </UButton>
        </div>
    </section>

    <section v-if="!pending">
        <div v-for="(transactionsOnDay, date) in byDate" :key="date">
            <DailyTransactionSummary :date="date" :transactions="transactionsOnDay" :key="date" />
            <Transaction v-for="transaction in transactionsOnDay" :key="transaction.id" :transaction="transaction"
                @deleted="refreshData" @edited="refreshData" />
        </div>
    </section>
    <section v-else>
        <USkeleton class="h-10 w-full mb-2" v-for="i in 4" :key="i" />
    </section>
</template>

<script setup>
import { transactionViewOptions } from "~/constants";
const user = useSupabaseUser();

const selectedView = ref(
    user.value.user_metadata?.transaction_view ?? transactionViewOptions[1],
);
const isOpen = ref(false);
watch(selectedView, () => {
    refreshData();
});

const { currentPeriod, previousPeriod } = useSelectedTimePeriod(selectedView);
const {
    transactions: {
        grouped: { byDate },
        incomeCount,
        expenseCount,
        investmentTotal,
        savingTotal,
        incomeTotal,
        expenseTotal,
    },
    pending,
    refreshTransactions,
} = await useFetchTransactions(currentPeriod);

const refreshData = () => {
    refreshTransactions();
    previousRefreshTransactions();
}

const {
    transactions: {
        incomeTotal: previousIncomeTotal,
        expenseTotal: previousExpenseTotal,
        investmentTotal: previousInvestmentTotal,
        savingTotal: previousSavingTotal,
    },
    refreshTransactions: previousRefreshTransactions,
} = await useFetchTransactions(previousPeriod);
</script>
