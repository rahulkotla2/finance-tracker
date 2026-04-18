<template>
  <div v-if="accessPending" class="space-y-6">
    <USkeleton class="h-10 w-64" />
    <USkeleton class="h-24 w-full" />
    <USkeleton class="h-40 w-full" />
  </div>

  <div v-else-if="myMembership" class="space-y-10">
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <NuxtLink
          to="/groups"
          class="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Back to groups
        </NuxtLink>
      </div>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-4xl font-extrabold">{{ groupTitle }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Members and shared transactions</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <UFormField label="Member filter" name="memberFilter" class="min-w-48">
            <USelectMenu
              v-model="memberFilterUserId"
              value-key="id"
              :items="memberFilterItems"
              placeholder="All members"
              class="w-56"
            />
          </UFormField>
          <USelectMenu v-model="selectedView" :items="transactionViewOptions" />
        </div>
      </div>

      <div v-if="membersPending" class="flex gap-2 flex-wrap">
        <USkeleton v-for="i in 3" :key="i" class="h-10 w-32 rounded-full" />
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <div
          v-for="m in members ?? []"
          :key="m.id"
          class="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
        >
          <UAvatar v-if="avatarSrc(m)" :src="avatarSrc(m)" size="xs" />
          <span class="font-medium">{{ memberDisplayName(m) }}</span>
          <UBadge color="neutral" variant="outline" class="text-xs">{{ m.role }}</UBadge>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-16">
      <Trend
        color="green"
        title="Income"
        :amount="currentSummary.incomeTotal"
        :last-amount="previousSummary.incomeTotal"
        :loading="pending"
      />
      <Trend
        color="red"
        title="Expense"
        :amount="currentSummary.expenseTotal"
        :last-amount="previousSummary.expenseTotal"
        :loading="pending"
      />
      <Trend
        color="green"
        title="Investments"
        :amount="currentSummary.investmentTotal"
        :last-amount="previousSummary.investmentTotal"
        :loading="pending"
      />
      <Trend
        color="red"
        title="Saving"
        :amount="currentSummary.savingTotal"
        :last-amount="previousSummary.savingTotal"
        :loading="pending"
      />
    </section>

    <section class="flex justify-between mb-10">
      <div>
        <h2>Transactions</h2>
        <div class="text-gray-500 dark:text-gray-400">
          You have {{ currentSummary.incomeCount }} incomes and {{ currentSummary.expenseCount }} expenses this
          period
        </div>
      </div>
      <div>
        <TransactionModal :group-id="groupIdString" @saved="refreshData" v-model:isOpen="isOpen" />
        <UButton
          color="neutral"
          icon="i-heroicons-plus-circle-solid"
          variant="outline"
          label="Add"
          @click="isOpen = true"
        />
      </div>
    </section>

    <section v-if="!pending">
      <div v-for="(transactionsOnDay, date) in byDateFiltered" :key="date">
        <DailyTransactionSummary :date="date" :transactions="transactionsOnDay" />
        <Transaction
          v-for="transaction in transactionsOnDay"
          :key="transaction.id"
          :transaction="transaction"
          :group-id="groupIdString"
          :show-group-badge="false"
          show-owner-badge
          @deleted="refreshData"
          @edited="refreshData"
        />
      </div>
    </section>
    <section v-else>
      <USkeleton class="h-10 w-full mb-2" v-for="i in 4" :key="i" />
    </section>
  </div>
</template>

<script setup>
import { navigateTo } from "#app";
import { transactionViewOptions } from "~/constants";
import {
  filterTransactionsByUserId,
  groupTransactionsByDate,
  summarizeTransactions,
} from "~/utils/transactions";

const route = useRoute();
const user = useSupabaseUser();
const { toastError } = useAppToast();
const { getMyGroupMembership, listGroupMembers } = useExpenseGroups();
const supabase = useSupabaseClient();

const groupIdString = computed(() => {
  const raw = route.params.groupId;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return id ? String(id) : "";
});

const accessKey = computed(() => `group-access-${groupIdString.value}`);
const membersKey = computed(() => `group-members-${groupIdString.value}`);

const selectedView = ref(
  user.value?.user_metadata?.transaction_view ?? transactionViewOptions[1],
);
const isOpen = ref(false);
const memberFilterUserId = ref("");

const { currentPeriod, previousPeriod } = useSelectedTimePeriod(selectedView);

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
      toastError({ title: "Unable to view this group", description: "You are not a member of this group." });
      navigateTo("/groups");
    }
  },
  { immediate: true },
);

const groupTitle = computed(() => myMembership.value?.expense_groups?.name ?? "Group");

useHead({
  title: computed(() => (groupTitle.value ? `${groupTitle.value} · Group` : "Group")),
});

const memberDisplayName = (m) => {
  const p = m.profiles;
  const name = Array.isArray(p) ? p[0]?.full_name : p?.full_name;
  if (name) return name;
  if (m.user_id) return `Member …${String(m.user_id).slice(-6)}`;
  return "Member";
};

const avatarSrc = (m) => {
  const p = m.profiles;
  const path = Array.isArray(p) ? p[0]?.avatar_url : p?.avatar_url;
  if (!path) return undefined;
  if (String(path).startsWith("http")) return String(path);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl;
};

const memberFilterItems = computed(() => [
  { label: "All members", id: "" },
  ...(members.value ?? []).map((m) => ({
    label: memberDisplayName(m),
    id: m.user_id,
  })),
]);

const {
  transactions: { all: currentAll },
  pending,
  refreshTransactions,
} = await useFetchTransactions(currentPeriod, { scope: "group", groupId: groupIdString });

const {
  transactions: { all: previousAll },
  refreshTransactions: previousRefreshTransactions,
} = await useFetchTransactions(previousPeriod, { scope: "group", groupId: groupIdString });

const refreshData = () => {
  refreshTransactions();
  previousRefreshTransactions();
};

const currentFiltered = computed(() =>
  filterTransactionsByUserId(currentAll.value, memberFilterUserId.value || null),
);

const previousFiltered = computed(() =>
  filterTransactionsByUserId(previousAll.value, memberFilterUserId.value || null),
);

const currentSummary = computed(() => summarizeTransactions(currentFiltered.value));
const previousSummary = computed(() => summarizeTransactions(previousFiltered.value));

const byDateFiltered = computed(() => groupTransactionsByDate(currentFiltered.value));

watch(selectedView, () => {
  refreshData();
});
</script>
