export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // public routes
  const publicRoutes = ['/login']

  // allow public pages
  if (publicRoutes.includes(to.path)) return

  // IMPORTANT: wait for auth to resolve
  if (user.value === undefined) return

  // not logged in → redirect
  if (!user.value) {
    return navigateTo(`/login`)
  }
})