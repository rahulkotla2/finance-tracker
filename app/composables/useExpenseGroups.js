const INVITE_EXPIRY_DAYS = 14;

async function generateInviteToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const { randomBytes } = await import("node:crypto");
  return randomBytes(24).toString("hex");
}

export function useExpenseGroups() {
  const supabase = useSupabaseClient();

  async function listMyMemberships() {
    return supabase.rpc("get_user_groups");
  }

  async function createGroupWithInvite(name) {
    const { data: group, error: groupError } = await supabase
      .from("expense_groups")
      .insert({ name })
      .select("id, name")
      .single();

    console.log(groupError);

    if (groupError) throw groupError;

    const { error: membershipError } = await supabase
      .from("group_members")
      .insert({
        group_id: group.id,
        role: "owner",
        status: "active",
      });

    if (membershipError) throw membershipError;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const token = await generateInviteToken();

    const { data: invite, error: inviteError } = await supabase
      .from("group_invites")
      .insert({
        token,
        group_id: group.id,
        expires_at: expiresAt.toISOString(),
      })
      .select("token, expires_at")
      .single();

    if (inviteError) throw inviteError;

    return { group, invite };
  }

  async function acceptInvite(token) {
    const trimmed = token?.trim();
    if (!trimmed) throw new Error("Invite token is required");

    const { data, error } = await supabase.rpc("accept_group_invite", {
      invite_token: trimmed,
    });

    if (error) throw error;
    return data;
  }

  async function getMyGroupMembership(groupId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("group_members")
      .select("id, role, status, expense_groups(id, name)")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    return { data, error };
  }

  async function listGroupMembers(groupId) {
    return supabase
      .from("group_members")
      .select("id, role, status, user_id, profiles(id, full_name, avatar_url)")
      .eq("group_id", groupId)
      .eq("status", "active")
      .order("created_at", { ascending: true });
  }

  return {
    listMyMemberships,
    createGroupWithInvite,
    acceptInvite,
    getMyGroupMembership,
    listGroupMembers,
  };
}
