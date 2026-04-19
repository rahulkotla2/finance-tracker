<template>
  <UForm :state="state" :schema="schema" @submit="updatePassword">
    <UFormField label="Password" name="password" class="mb-4" :required="true">
      <UInput
        v-model="state.password"
        type="password"
        placeholder="New password"
        autocomplete="new-password"
        class="w-full"
      />
    </UFormField>
    <UFormField
      label="Confirm password"
      name="confirmPassword"
      class="mb-4"
      :required="true"
    >
      <UInput
        v-model="state.confirmPassword"
        type="password"
        placeholder="Confirm new password"
        autocomplete="new-password"
        class="w-full"
      />
    </UFormField>
    <UButton
      type="submit"
      label="Update password"
      color="neutral"
      variant="solid"
      :loading="isLoading"
      :disabled="isLoading"
    />
  </UForm>
</template>

<script setup>
import { z } from "zod";

const supabase = useSupabaseClient();
const isLoading = ref(false);
const { toastSuccess, toastError } = useAppToast();

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const state = ref({
  password: "",
  confirmPassword: "",
});

const updatePassword = async () => {
  isLoading.value = true;
  try {
    const { error } = await supabase.auth.updateUser({
      password: state.value.password,
    });
    if (error) throw error;
    state.value.password = "";
    state.value.confirmPassword = "";
    toastSuccess({
      title: "Password updated",
      description: "Your password has been changed successfully.",
    });
  } catch (error) {
    toastError({
      title: "Error updating password",
      description: error.message,
    });
  } finally {
    isLoading.value = false;
  }
};
</script>
