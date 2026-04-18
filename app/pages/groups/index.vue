<template>
  <div class="space-y-10">
    <section class="grid gap-6 lg:grid-cols-2">
      <div class="p-6 border border-gray-200 rounded-lg dark:border-gray-800 bg-white dark:bg-gray-900">
        <h2 class="text-xl font-semibold mb-2">Create a group</h2>
        <p class="text-sm text-gray-500 mb-4">Start a shared workspace and generate an invite token.</p>
        <UFormField label="Group name" name="group">
          <UInput v-model="groupName" placeholder="e.g. Household Budgets" />
        </UFormField>
        <div class="flex items-center gap-3 mt-4">
          <UButton
            :loading="isCreating"
            color="neutral"
            variant="solid"
            label="Create group"
            @click="handleCreateGroup"
          />
          <UBadge color="info" variant="subtle" v-if="inviteToken">Invite token ready</UBadge>
        </div>
        <p v-if="inviteToken" class="text-xs text-gray-500 mt-2 font-mono break-all">{{ inviteToken }}</p>
      </div>
      <div class="p-6 border border-gray-200 rounded-lg dark:border-gray-800 bg-white dark:bg-gray-900">
        <h2 class="text-xl font-semibold mb-2">Join a group</h2>
        <p class="text-sm text-gray-500 mb-4">Enter the invite token shared with you.</p>
        <UFormField label="Invite token" name="token">
          <UInput v-model="joinToken" placeholder="Token" />
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
      <div v-if="!memberships.length" class="text-sm text-gray-500">No memberships yet.</div>
      <div class="grid gap-4">
        <article
          v-for="group in memberships"
          :key="group.id"
          class="border border-gray-200 rounded-lg p-4 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-lg">{{ group.name ?? "Unnamed group" }}</p>
                <UBadge v-if="group.is_owner" color="warning" variant="subtle">Owner</UBadge>
              </div>
            </div>
            <NuxtLink
              v-if="group.id"
              :to="`/groups/${group.id}`"
              class="text-sm font-medium shrink-0 text-blue-600 dark:text-blue-400"
            >
              View
            </NuxtLink>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Created {{ group.created_at ? new Date(group.created_at).toLocaleDateString() : "—" }}
          </p>
          <div
            v-if="group.is_owner && group.token"
            class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800"
          >
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Invite token</p>
            <p class="text-xs font-mono break-all text-gray-700 dark:text-gray-300 mb-3">{{ group.token }}</p>
            <div class="flex flex-wrap gap-2">
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
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useExpenseGroups } from "~/composables/useExpenseGroups";

const { listMyMemberships, createGroupWithInvite, acceptInvite } = useExpenseGroups();
const { toastSuccess, toastError } = useAppToast();

const groupName = ref("");
const inviteToken = ref("");
const joinToken = ref("");
const memberships = ref([]);
const isCreating = ref(false);
const isJoining = ref(false);

const canShare = computed(
  () => import.meta.client && typeof navigator !== "undefined" && typeof navigator.share === "function",
);

const copyGroupToken = async (token) => {
  try {
    await navigator.clipboard.writeText(token);
    toastSuccess({ title: "Copied", description: "Invite token copied to clipboard." });
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

const refresh = async () => {
  const { data, error } = await listMyMemberships();
  if (error) {
    toastError({ title: "Unable to read groups", description: error.message });
    return;
  }
  memberships.value = data ?? [];
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
    toastSuccess({ title: "Group created", description: "Share this token with your collaborators." });
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
    toastSuccess({ title: "Joined", description: "Now you can see the group finances" });
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
</script>
