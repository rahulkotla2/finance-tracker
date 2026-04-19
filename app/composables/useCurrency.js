export const useCurrency = (amount) => {
    const currency = computed(() => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'INR',
        }).format(isRef(amount) ? amount.value : amount)
    })

    return {
        currency
    }
}