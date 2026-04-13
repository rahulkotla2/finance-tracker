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
          v-for="member in memberships"
          :key="member.id"
          class="border border-gray-200 rounded-lg p-4 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-lg">{{ member.expense_groups?.name ?? "Unnamed group" }}</p>
              <p class="text-xs uppercase tracking-wider text-gray-500">
                {{ member.status }} • {{ member.role }}
              </p>
            </div>
            <NuxtLink
              v-if="member.status === 'active' && member.expense_groups?.id"
              to="/groups"
              class="text-sm font-medium text-blue-600 dark:text-blue-400"
            >
              View
            </NuxtLink>
          </div>
          <p class="text-xs text-gray-500">
            Created {{ member.expense_groups?.created_at ? new Date(member.expense_groups.created_at).toLocaleDateString() : "—" }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useExpenseGroups } from "~/composables/useExpenseGroups";

const { listMyMemberships, createGroupWithInvite, acceptInvite } = useExpenseGroups();
const { toastSuccess, toastError } = useAppToast();

const groupName = ref("");
const inviteToken = ref("");
const joinToken = ref("");
const memberships = ref([]);
const isCreating = ref(false);
const isJoining = ref(false);

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
