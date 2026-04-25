<template>
  <div v-if="accessPending" class="space-y-6">
    <USkeleton class="h-10 w-64" />
    <USkeleton class="h-24 w-full" />
    <USkeleton class="h-40 w-full" />
  </div>

  <div v-else-if="myMembership" class="space-y-0">
    <GroupCreditCardView
      v-if="groupType === 'credit_card'"
      :group-id="groupIdString"
      :group-title="groupTitle"
      :members="members ?? []"
    />
    <GroupMonthlyView
      v-else-if="groupType === 'monthly'"
      :group-id="groupIdString"
      :group-title="groupTitle"
      :members="members ?? []"
      :cycle-start-day="monthlyCycleStartDay"
      :cycle-end-day="monthlyCycleEndDay"
    />
    <GroupDefaultView
      v-else
      :group-id="groupIdString"
      :group-title="groupTitle"
      :group-category-label="groupCategoryLabel"
      :members="members ?? []"
      :members-pending="membersPending"
    />
  </div>
</template>

<script setup>
import { navigateTo } from "#app";
import { expenseGroupCategoryOptions } from "~/constants";

const route = useRoute();
const { toastError } = useAppToast();
const { getMyGroupMembership, listGroupMembers } = useExpenseGroups();

const groupIdString = computed(() => {
  const raw = route.params.groupId;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return id ? String(id) : "";
});

const accessKey = computed(() => `group-access-${groupIdString.value}`);
const membersKey = computed(() => `group-members-${groupIdString.value}`);

const { data: myMembership, pending: accessPending } = await useAsyncData(
  accessKey,
  async () => {
    if (!groupIdString.value) return null;
    const { data, error } = await getMyGroupMembership(groupIdString.value);
    if (error) return null;
    return data;
  },
  { watch: [groupIdString] },
);

const { data: members, pending: membersPending } = await useAsyncData(
  membersKey,
  async () => {
    if (!groupIdString.value) return [];
    const { data, error } = await listGroupMembers(groupIdString.value);
    if (error) {
      console.error(error);
      return [];
    }
    return data ?? [];
  },
  { watch: [groupIdString] },
);

watch(
  [myMembership, accessPending],
  () => {
    if (accessPending.value) return;
    if (!groupIdString.value) return;
    if (!myMembership.value) {
      toastError({
        title: "Unable to view this group",
        description: "You are not a member of this group.",
      });
      navigateTo("/groups");
    }
  },
  { immediate: true },
);

const groupTitle = computed(
  () => myMembership.value?.expense_groups?.name ?? "Group",
);

const groupType = computed(() => {
  const eg = myMembership.value?.expense_groups;
  if (!eg) return null;
  return eg.type ?? eg.category ?? null;
});

const groupCategoryLabel = computed(() => {
  const c = groupType.value;
  if (!c) return null;
  return expenseGroupCategoryOptions.find((o) => o.value === c)?.label ?? null;
});

const monthlyCycleStartDay = computed(
  () => myMembership.value?.expense_groups?.cycle_start_day ?? null,
);
const monthlyCycleEndDay = computed(
  () => myMembership.value?.expense_groups?.cycle_end_day ?? null,
);

useHead({
  title: computed(() =>
    groupTitle.value ? `${groupTitle.value} · Group` : "Group",
  ),
});
</script>
