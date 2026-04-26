export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  const publicRoutes = ['/login']

  if (publicRoutes.includes(to.path)) return

  const supabase = useSupabaseClient()

  if (!user.value) {
    const { data } = await supabase.auth.getSession()
    if (!data.session?.user) {
      return navigateTo('/login')
    }
  } else if (!user.value) {
    return navigateTo('/login')
  }
})