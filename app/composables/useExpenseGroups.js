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
  const user = useSupabaseUser();

  async function listMyMemberships() {
    const uid = user.value?.id;
    if (!uid) return { data: [], error: null };

    return supabase
      .from("group_members")
      .select("id, role, status, expense_groups(id, name, created_at)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
  }

  async function createGroupWithInvite(name) {
    const uid = user.value?.id;
    if (!uid) throw new Error("Not signed in");

    const { data: group, error: groupError } = await supabase
      .from("expense_groups")
      .insert({ name, created_by: uid })
      .select("id, name")
      .single();

    if (groupError) throw groupError;

    const { error: membershipError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: uid,
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
        invited_by: uid,
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

  return {
    listMyMemberships,
    createGroupWithInvite,
    acceptInvite,
  };
}
