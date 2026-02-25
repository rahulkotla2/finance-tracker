<template>
    <section class="flex items-center justify-between mb-10">
        <h1 class="text-4xl font-extrabold">Summary</h1>
        <div>
            <USelectMenu v-model="selectedView" :items="transactionViewOptions" />
        </div>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 sm:gap-16 mb-10">
        <Trend title="Income" :amount="4000" :lastAmount="3000" color="green" :loading="false" />
        <Trend title="Expenses" :amount="4000" :lastAmount="5000" color="red" :loading="false" />
        <Trend title="Investments" :amount="4000" :lastAmount="3000" color="green" :loading="false" />
        <Trend title="Savings" :amount="4000" :lastAmount="4100" color="red" :loading="false" />
    </section>

    <section>
        <Transaction />
        <Transaction />
        <Transaction />
    </section>
</template>

<script setup>
import { transactionViewOptions } from '~/constants'
const selectedView = ref('Monthly')

</script>