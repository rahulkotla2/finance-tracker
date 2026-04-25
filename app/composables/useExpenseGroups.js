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

  /**
   * @param {string} name
   * @param {"credit_card"|"monthly"|"other"} type
   * @param {object} [options]
   * @param {number} [options.monthlyCycleStartDay]  1–31, `type === "monthly"` only
   * @param {number} [options.monthlyCycleEndDay]   1–31, `type === "monthly"` only
   */
  async function createGroupWithInvite(name, type, options = {}) {
    const row = { name, type };

    if (type === "monthly") {
      if (options.monthlyCycleStartDay == null || options.monthlyCycleEndDay == null) {
        throw new Error("Monthly groups require a cycle start day and cycle end day (1–31).");
      }
      const s = Math.floor(Number(options.monthlyCycleStartDay));
      const e = Math.floor(Number(options.monthlyCycleEndDay));
      if (!Number.isFinite(s) || s < 1 || s > 31 || !Number.isFinite(e) || e < 1 || e > 31) {
        throw new Error("Cycle start and end must be days of the month from 1 to 31.");
      }
      row.cycle_start_day = s;
      row.cycle_end_day = e;
    }

    const { data: group, error: groupError } = await supabase
      .from("expense_groups")
      .insert(row)
      .select("id, name, type, cycle_start_day, cycle_end_day")
      .single();

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

  /**
   * Permanently removes a group. Only the active owner membership may run this.
   * Deletes child rows in dependency order (transactions for this group, then invites,
   * members, and the group row).
   */
  async function deleteGroupAsOwner(groupId) {
    const { data: membership, error: membershipReadError } = await getMyGroupMembership(groupId);
    if (membershipReadError) throw membershipReadError;
    if (!membership || membership.role !== "owner") {
      throw new Error("Only the group owner can delete this group.");
    }

    const { error: txError } = await supabase.from("transactions").delete().eq("group_id", groupId);
    if (txError) throw txError;

    const { error: invitesError } = await supabase.from("group_invites").delete().eq("group_id", groupId);
    if (invitesError) throw invitesError;

    const { error: membersError } = await supabase.from("group_members").delete().eq("group_id", groupId);
    if (membersError) throw membersError;

    const { data: removedGroup, error: groupError } = await supabase
      .from("expense_groups")
      .delete()
      .eq("id", groupId)
      .select("id")
      .maybeSingle();

    if (groupError) throw groupError;
    if (!removedGroup?.id) {
      throw new Error(
        "The group was not removed (nothing deleted). Check that your database policies allow the owner to delete this group.",
      );
    }
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
      .select("id, role, status, expense_groups(id, name, type, cycle_start_day, cycle_end_day)")
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

  /** Latest row for this group (owner RLS should allow select on own groups). */
  async function getLatestInviteForGroup(groupId) {
    const { data, error } = await supabase
      .from("group_invites")
      .select("token, expires_at")
      .eq("group_id", groupId)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }

  return {
    listMyMemberships,
    createGroupWithInvite,
    acceptInvite,
    getMyGroupMembership,
    listGroupMembers,
    deleteGroupAsOwner,
    getLatestInviteForGroup,
  };
}
