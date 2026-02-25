<template>
    <div class="grid grid-cols-2 py-4 border-b">
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-1">
                <UIcon name="i-heroicons-arrow-up-right-solid" class=" text-green-600" />
                <div>Salary</div>
            </div>
            <div>
                <UBadge color="neutral" variant="outline">Category</UBadge>
            </div>
        </div>
        <div class="flex items-center justify-end space-x-2">
            <div>{{ currency }}</div>
            <div>
                <UDropdownMenu :items="items" :popper="{ placement: 'bottom-start' }">
                    <UButton trailing-icon="i-heroicons-ellipsis-horizontal-solid" color="neutral" variant="ghost" />
                </UDropdownMenu>
            </div>
        </div>
    </div>
</template>

<script setup>
const { currency } = useCurrency(3000)
const items = [[
    {
        label: 'Edit',
        icon: 'i-heroicons-pencil-square-20-solid',
        action: () => {
            console.log('Edit')
        }
    },
    {
        label: 'Delete',
        icon: 'i-heroicons-trash-20-solid',
        action: () => {
            console.log('Delete')
        }
    }

]]
</script>