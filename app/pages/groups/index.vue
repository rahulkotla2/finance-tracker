<template>
  <div class="space-y-10">
    <section class="grid gap-6 lg:grid-cols-2">
      <div
        class="p-6 border border-gray-200 rounded-lg dark:border-gray-800 bg-white dark:bg-gray-900"
      >
        <h2 class="text-xl font-semibold mb-2">Create a group</h2>
        <p class="text-sm text-gray-500 mb-4">
          Start a shared workspace and generate an invite token.
        </p>
        <UFormField label="Group name" name="group">
          <UInput
            v-model="groupName"
            placeholder="e.g. Household Budgets"
            class="w-full"
          />
        </UFormField>
        <div class="flex items-center gap-3 mt-4">
          <UButton
            :loading="isCreating"
            color="neutral"
            variant="solid"
            label="Create group"
            @click="handleCreateGroup"
          />
          <UBadge color="info" variant="subtle" v-if="inviteToken"
            >Invite token ready</UBadge
          >
        </div>
        <p
          v-if="inviteToken"
          class="text-xs text-gray-500 mt-2 font-mono break-all"
        >
          {{ inviteToken }}
        </p>
      </div>
      <div
        class="p-6 border border-gray-200 rounded-lg dark:border-gray-800 bg-white dark:bg-gray-900"
      >
        <h2 class="text-xl font-semibold mb-2">Join a group</h2>
        <p class="text-sm text-gray-500 mb-4">
          Enter the invite token shared with you.
        </p>
        <UFormField label="Invite token" name="token">
          <UInput v-model="joinToken" placeholder="Token" class="w-full" />
        </UFormField>
        <UButton
          :loading="isJoining"
          color="neutral"
          variant="solid"
          label="Join group"
          class="mt-4"
          @click="handleJoinGroup"
        />
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-2xl font-bold">My groups</h2>
      <div v-if="!memberships.length" class="text-sm text-gray-500">
        No memberships yet.
      </div>
      <div class="grid gap-4">
        <article
          v-for="group in memberships"
          :key="group.id"
          class="border border-gray-200 rounded-lg p-4 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-lg">
                  {{ group.name ?? "Unnamed group" }}
                </p>
                <UBadge v-if="group.is_owner" color="warning" variant="subtle"
                  >Owner</UBadge
                >
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <NuxtLink
                v-if="group.id"
                :to="`/groups/${group.id}`"
                class="text-sm font-medium text-blue-600 dark:text-blue-400"
              >
                View
              </NuxtLink>
              <UButton
                v-if="group.is_owner && group.id"
                size="xs"
                color="error"
                variant="outline"
                icon="i-heroicons-trash-20-solid"
                aria-label="Delete group"
                @click="openDeleteModal(group)"
              />
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Created
            {{
              group.created_at
                ? new Date(group.created_at).toLocaleDateString()
                : "—"
            }}
          </p>
          <div
            v-if="group.is_owner"
            class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800"
          >
            <p
              class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2"
            >
              Invite token
            </p>
            <template v-if="group.token">
              <p
                class="text-xs font-mono break-all text-gray-700 dark:text-gray-300"
              >
                {{ group.token }}
              </p>
              <p
                v-if="group.invite_expires_at"
                class="text-xs text-gray-500 mt-1"
              >
                Expires {{ new Date(group.invite_expires_at).toLocaleString() }}
              </p>
              <div class="flex flex-wrap gap-2 mt-3">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  icon="i-heroicons-clipboard-document"
                  label="Copy"
                  @click="copyGroupToken(group.token)"
                />
                <UButton
                  v-if="canShare"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  icon="i-heroicons-share"
                  label="Share"
                  @click="shareGroupInvite(group)"
                />
              </div>
            </template>
            <p v-else class="text-xs text-gray-500">
              No invite token loaded. Ensure your Supabase policy allows owners
              to read
              <span class="font-mono">group_invites</span>
              for this group.
            </p>
          </div>
        </article>
      </div>
    </section>

    <UModal v-model:open="deleteModalOpen" title="Delete group">
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This permanently deletes
          <span class="font-medium text-gray-900 dark:text-gray-100">{{
            groupPendingDelete?.name ?? "this group"
          }}</span>
          , including invites, members, and all transactions stored for this
          group. This cannot be undone.
        </p>
        <div class="flex flex-wrap justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            label="Cancel"
            @click="deleteModalOpen = false"
          />
          <UButton
            color="error"
            variant="solid"
            label="Delete group"
            :loading="isDeletingGroup"
            @click="confirmDeleteGroup"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from "vue";
import { useExpenseGroups } from "~/composables/useExpenseGroups";

const {
  listMyMemberships,
  createGroupWithInvite,
  acceptInvite,
  deleteGroupAsOwner,
  getLatestInviteForGroup,
} = useExpenseGroups();
const { toastSuccess, toastError } = useAppToast();

const groupName = ref("");
const inviteToken = ref("");
const joinToken = ref("");
const memberships = ref([]);
const isCreating = ref(false);
const isJoining = ref(false);
const deleteModalOpen = ref(false);
const groupPendingDelete = ref(null);
const isDeletingGroup = ref(false);

const openDeleteModal = (group) => {
  groupPendingDelete.value = group;
  deleteModalOpen.value = true;
};

const normalizeGroupsPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") return [payload];
  return [];
};

/** Align RPC / view column names so the template always has id, is_owner, token, name. */
const normalizeGroupRow = (raw) => {
  if (!raw || typeof raw !== "object") return raw;
  const id = raw.id ?? raw.group_id;
  const token = raw.token ?? raw.invite_token ?? null;
  const isOwner = Boolean(raw.is_owner ?? raw.isOwner ?? raw.role === "owner");
  return {
    ...raw,
    id,
    name: raw.name ?? raw.group_name ?? null,
    is_owner: isOwner,
    token,
    created_at: raw.created_at ?? raw.createdAt ?? null,
    invite_expires_at: raw.invite_expires_at ?? raw.expires_at ?? null,
  };
};

const enrichOwnerInviteTokens = async (groups) => {
  await Promise.all(
    (groups ?? []).map(async (g) => {
      if (!g?.id || !g.is_owner) return;
      if (g.token && g.invite_expires_at) return;
      try {
        const inv = await getLatestInviteForGroup(g.id);
        if (inv?.token) {
          g.token = inv.token;
          g.invite_expires_at = inv.expires_at ?? g.invite_expires_at;
        }
      } catch {
        /* RLS or network — leave token empty */
      }
    }),
  );
};

const confirmDeleteGroup = async () => {
  const id = groupPendingDelete.value?.id;
  if (!id) return;
  try {
    isDeletingGroup.value = true;
    await deleteGroupAsOwner(id);
    memberships.value = memberships.value.filter((g) => g.id !== id);
    toastSuccess({
      title: "Group deleted",
      description: "The group and its data were removed.",
    });
    deleteModalOpen.value = false;
    groupPendingDelete.value = null;
    await refresh(id);
  } catch (error) {
    toastError({ title: "Delete failed", description: error.message });
  } finally {
    isDeletingGroup.value = false;
  }
};

const canShare = computed(
  () =>
    import.meta.client &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function",
);

const copyGroupToken = async (token) => {
  try {
    await navigator.clipboard.writeText(token);
    toastSuccess({
      title: "Copied",
      description: "Invite token copied to clipboard.",
    });
  } catch (error) {
    toastError({ title: "Copy failed", description: error.message });
  }
};

const shareGroupInvite = async (group) => {
  if (!group?.token) return;
  try {
    await navigator.share({
      title: `Join ${group.name ?? "group"}`,
      text: `Invite token for "${group.name ?? "group"}": ${group.token}`,
    });
  } catch (error) {
    if (error?.name === "AbortError") return;
    toastError({ title: "Share failed", description: error.message });
  }
};

const refresh = async (omitGroupId = null) => {
  const { data, error } = await listMyMemberships();
  if (error) {
    toastError({ title: "Unable to read groups", description: error.message });
    return;
  }
  let list = normalizeGroupsPayload(data).map(normalizeGroupRow);
  if (omitGroupId) {
    list = list.filter((g) => g && g.id !== omitGroupId);
  }
  await enrichOwnerInviteTokens(list);
  memberships.value = list;
};

const handleCreateGroup = async () => {
  if (!groupName.value.trim()) {
    toastError({ title: "Give the group a name" });
    return;
  }

  try {
    isCreating.value = true;
    const { invite } = await createGroupWithInvite(groupName.value.trim());
    inviteToken.value = invite.token;
    toastSuccess({
      title: "Group created",
      description: "Share this token with your collaborators.",
    });
    groupName.value = "";
    refresh();
  } catch (error) {
    toastError({ title: "Creation failed", description: error.message });
  } finally {
    isCreating.value = false;
  }
};

const handleJoinGroup = async () => {
  if (!joinToken.value.trim()) {
    toastError({ title: "Invite token required" });
    return;
  }

  try {
    isJoining.value = true;
    const data = await acceptInvite(joinToken.value.trim());
    toastSuccess({
      title: "Joined",
      description: "Now you can see the group finances",
    });
    joinToken.value = "";
    refresh();
  } catch (error) {
    toastError({ title: "Join failed", description: error.message });
  } finally {
    isJoining.value = false;
  }
};

onMounted(() => {
  refresh();
});

onActivated(() => {
  refresh();
});
</script>
