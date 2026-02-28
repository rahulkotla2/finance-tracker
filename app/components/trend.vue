<template>
    <div>
        <div class="font-bold" :class="[color]">
            {{ title }}
        </div>
        <div class="text-2xl font-extrabold text-black dark:text-white mb-2">
            <USkeleton class="h-8 w-full" v-if="loading" />
            <span v-else>{{ currency }}</span>
        </div>
        <div>
            <USkeleton class="h-4 w-full" v-if="loading" />
            <div v-else class="flex space-x-1 items-center">
                <UIcon :name="icon" class="w-6 h-6" :class="{ 'green': trendingUp, 'red': !trendingUp }" />
                <div class="text-gray-500 dark:text-gray-400">
                    {{ percentageTrend }} vs last period
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    title: String,
    amount: Number,
    lastAmount: Number,
    color: String,
    loading: Boolean,
})

const { amount } = toRefs(props)

const trendingUp = computed(() => {
    return props.amount >= props.lastAmount
})

const icon = computed(() => {
    return trendingUp.value ? 'i-heroicons-arrow-trending-up-solid' : 'i-heroicons-arrow-trending-down-solid'
})

const { currency } = useCurrency(amount)

const percentageTrend = computed(() => {
    console.log(props.lastAmount, props.amount)
    if (props.lastAmount === 0 || props.amount === 0) return '♾️%'
    const biggerAmount = Math.max(props.amount, props.lastAmount)
    const smallerAmount = Math.min(props.amount, props.lastAmount)

    return `${Math.ceil(((biggerAmount - smallerAmount) / smallerAmount) * 100)}%`
})
</script>

<style scoped>
@reference "~/assets/css/main.css";

.green {
    @apply text-green-500 dark:text-green-400;
}

.red {
    @apply text-red-500 dark:text-red-400;
}
</style>