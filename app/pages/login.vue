<template>
    <UCard v-if="!success">
        <template #header> Sign-in to Finance Tracker</template>
        <form @submit.prevent="handleLogin">
            <UFormField label="Email" name="email" :required="true"
                help="You will receive an email with confirmation link">
                <UInput type="email" placeholder="Email" v-model="email" />
            </UFormField>
            <UButton type="submit" label="Sign in" color="neutral" variant="solid" class="mt-5" :loading="pending"
                :disabled="pending" />
        </form>
    </UCard>
    <UCard v-else>
        <template #header> Email has been sent</template>
        <div class="text-center">
            <p>We have sent an email to <strong>{{ email }}</strong> with a link to sign in.</p>
            <p><strong>Important:</strong> The link will expire in 5 minutes.</p>
        </div>
    </UCard>
</template>

<script setup>
const success = ref(false)
const email = ref('')
const pending = ref(false)
const toast = useToast()
const supabase = useSupabaseClient()
useRedirectedIfAuthenticated()

const handleLogin = async () => {
    pending.value = true
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: email.value,
            options: {
                emailRedirectTo: `http://localhost:3000`
            }
        })
        if (error) throw error
        success.value = true
    } catch (error) {
        toast.add({
            title: 'Error Authenticating',
            description: error.message,
            icon: 'i-heroicons-exclamation-circle-solid',
            color: 'error'
        })
    }
    finally {
        pending.value = false
    }
}
</script>