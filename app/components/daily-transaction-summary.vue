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
import { isCcReserve, isCcPaymentToOwner } from "~/utils/creditCardTransaction";

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
  transactions: {
    type: Array,
    required: true,
  },
  /** When true, Reserve/Settle count as inflows, Expense as outflow. */
  creditLineNet: {
    type: Boolean,
    default: false,
  },
});

const sum = computed(() => {
    let s = 0
    for (const transaction of props.transactions) {
        if (props.creditLineNet) {
            const t = transaction
            if (isCcReserve(t) || isCcPaymentToOwner(t) || t.type === "Income" || t.type === "Reserve" || t.type === "Settle") {
                s += t.amount
            } else {
                s -= t.amount
            }
        } else {
            transaction.type === 'Income' ? s += transaction.amount : s -= transaction.amount
        }
    }
    return s
})

const { currency } = useCurrency(sum)
</script>