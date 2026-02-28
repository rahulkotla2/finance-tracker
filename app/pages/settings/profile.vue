<template>
  <UForm :state="state" :schema="schema" @submit="saveProfile">
    <UFormField label="Full Name" name="Full Name" class="mb-4">
      <UInput
        v-model="state.name"
        type="text"
        placeholder="Full Name"
        class="w-full"
      />
    </UFormField>
    <UFormField
      label="Email"
      name="email"
      :required="true"
      class="mb-4"
      help="You will receive an confirmation email to both your old and new email addresses if you modify your email address"
    >
      <UInput
        v-model="state.email"
        type="email"
        placeholder="Email"
        class="w-full"
      />
    </UFormField>
    <UButton
      type="submit"
      label="Save"
      color="neutral"
      variant="solid"
      :loading="isLoading"
      :disabled="isLoading"
    />
  </UForm>
</template>
<script setup>
import { z } from "zod";
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const schema = z.object({
  name: z.string().min(2).optional(),
  email: z.email(),
});
const state = ref({
  name: user.value.user_metadata?.full_name,
  email: user.value.email,
});
const isLoading = ref(false);
const { toastSuccess, toastError } = useAppToast();

const saveProfile = async () => {
  isLoading.value = true;
  try {
    const data = {
      data: {
        full_name: state.value.name,
      },
    };
    if (state.value.email !== user.value.email) {
      data.email = state.value.email;
    }

    const { error } = await supabase.auth.updateUser(data);
    if (error) throw error;
    toastSuccess({
      title: "Profile updated",
      description: "Your profile has been updated successfully",
    });
  } catch (error) {
    toastError({ title: "Error updating profile", description: error.message });
  } finally {
    isLoading.value = false;
  }
};
</script>
