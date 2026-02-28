export const useAvatarUrl = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const avatarUrl = () => {
    if (!user.value.user_metadata?.avatar_url) return null;
    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(user.value.user_metadata?.avatar_url);
    return data.publicUrl;
  };

  const url = ref(avatarUrl());

  watch(
    user,
    () => {
      url.value = avatarUrl();
    },
    { immediate: true },
  );

  return { url };
};
