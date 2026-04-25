export const useRedirectedIfAuthenticated = (url = "/") => {
  const user = useSupabaseUser();

  watch(
    user,
    (user) => {
      if (user) {
        console.log(user);
        return navigateTo(url);
      }
    },
    { immediate: true },
  );
};
