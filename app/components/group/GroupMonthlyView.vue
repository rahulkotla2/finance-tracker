<template>
  <div class="space-y-10">
    <div class="flex flex-col gap-3 mt-5">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-extrabold">{{ groupTitle || "Monthly group" }}</h1>
        <div
          v-if="owner"
          class="h-fit inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
        >
          <UAvatar
            v-if="avatarSrc(owner)"
            :src="avatarSrc(owner)"
            size="xs"
          />
          <span class="font-medium">{{ memberDisplayName(owner) }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-end justify-between gap-3 mt-2">
        <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <UFormField name="memberFilter" label="Member" class="min-w-48">
            <USelectMenu
              v-model="memberFilterUserId"
              value-key="id"
              :items="memberFilterItems"
              placeholder="All members"
              class="w-56"
            >
              <template #item-trailing="{ item }">
                <UBadge
                  v-if="isMemberItemGroupOwner(item)"
                  color="primary"
                  variant="subtle"
                  class="shrink-0 text-[11px] font-medium"
                >
                  Group owner
                </UBadge>
              </template>
            </USelectMenu>
          </UFormField>
          <UFormField
            v-if="cycleMenuItems.length"
            name="cycle"
            :label="hasConfiguredCycle ? 'Expense period' : 'Month (calendar)'"
            class="min-w-64"
          >
            <USelectMenu
              v-model="selectedPeriodId"
              value-key="id"
              :items="cycleMenuItems"
              class="w-full min-w-64"
            />
          </UFormField>
        </div>
      </div>
    </div>

    <p
      v-if="hasConfiguredCycle && !cycleMenuItems.length && !pending"
      class="text-sm text-amber-700 dark:text-amber-300"
    >
      Could not build expense periods from these cycle days. Check that start and end days are
      valid (1–31).
    </p>

    <section class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 sm:gap-6 lg:gap-10">
      <Trend
        color="green"
        title="Allocated Funds"
        :amount="currentSummary.incomeTotal"
        :loading="pending"
      />
      <Trend
        color="red"
        title="Total Spends"
        :amount="currentSummary.expenseTotal"
        :loading="pending"
      />
      <Trend
        :color="currentSummary.incomeTotal - currentSummary.expenseTotal >= 0 ? 'green' : 'text-red-600 dark:text-red-400'"
        :title="currentSummary.incomeTotal - currentSummary.expenseTotal >= 0 ? 'Remaining Amount' : 'Debt'"
        :amount="Math.abs(currentSummary.incomeTotal - currentSummary.expenseTotal)"
        :loading="pending"
      />
    </section>

    <section class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div class="min-w-0 flex-1 space-y-1">
        <h2 class="text-lg font-bold">Activity</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          <template v-if="filterNote">{{ filterNote }}</template>
          <template v-else-if="selectedCycleLabel">
            All activity in <span class="font-medium text-gray-700 dark:text-gray-300">{{ selectedCycleLabel }}</span>.
          </template>
          <template v-else>Transactions in the selected period.</template>
        </p>
        <p
          v-if="!pending && filteredList.length"
          class="text-sm text-gray-600 dark:text-gray-400"
        >
          {{ currentSummary.incomeCount }} allocated funds · {{ currentSummary.expenseCount }} spends
        </p>
      </div>
      <div class="flex items-center gap-2">
        <TransactionModal
          v-model:isOpen="isAddOpen"
          :group-id="groupId"
          @saved="refreshData"
        />
        <UButton
          color="neutral"
          icon="i-heroicons-plus-circle-solid"
          variant="outline"
          label="Add"
          @click="isAddOpen = true"
        />
      </div>
    </section>

    <section v-if="filteredList.length" class="space-y-0">
      <div v-for="(dayTx, date) in byDate" :key="String(date)">
        <DailyTransactionSummary :date="String(date)" :transactions="dayTx" />
        <Transaction
          v-for="t in dayTx"
          :key="t.id"
          :transaction="t"
          :group-id="groupId"
          :group-owner-user-id="ownerUserId"
          :member-names-by-user-id="memberNameByUserId"
          :show-group-badge="false"
          show-owner-badge
          @deleted="refreshData"
          @edited="refreshData"
        />
      </div>
    </section>
    <p
      v-else-if="!pending"
      class="text-sm text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6"
    >
      No transactions in this period for this filter.
    </p>
    <div v-else>
      <USkeleton v-for="i in 4" :key="i" class="h-12 w-full mb-2" />
    </div>
  </div>
</template>

<script setup>
import { format, subMonths, endOfMonth, startOfMonth } from "date-fns";
import {
  listCardStatementCycleMenuItems,
} from "~/utils/billingCycle";
import {
  groupTransactionsByDate,
  filterTransactionsByUserId,
  summarizeTransactions,
} from "~/utils/transactions";

const props = defineProps({
  groupId: { type: String, required: true },
  groupTitle: { type: String, default: "" },
  members: { type: Array, default: () => [] },
  /** From `expense_groups.cycle_start_day` when type is monthly */
  cycleStartDay: { type: [Number, String], default: null },
  /** From `expense_groups.cycle_end_day` when type is monthly */
  cycleEndDay: { type: [Number, String], default: null },
});

const user = useSupabaseUser();
const supabase = useSupabaseClient();

const isAddOpen = ref(false);
const memberFilterUserId = ref("ALL");
const selectedPeriodId = ref("");

const memberDisplayName = (m) => {
  const n = m?.profiles?.full_name;
  if (n) return n;
  if (m?.user_id) return `Member …${String(m.user_id).slice(-6)}`;
  return "Member";
};

const avatarSrc = (m) => {
  const path = m?.profiles?.avatar_url;
  if (!path) return undefined;
  if (String(path).startsWith("http")) return String(path);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl;
};

const owner = computed(() =>
  (props.members ?? []).find((m) => m && m.role === "owner"),
);
const ownerUserId = computed(() => owner.value?.user_id ?? "");

function isMemberItemGroupOwner(item) {
  return Boolean(
    item &&
      typeof item === "object" &&
      item.isGroupOwner &&
      item.id !== "ALL",
  );
}

const memberFilterItems = computed(() => {
  const rows = (props.members ?? [])
    .filter((m) => m && m.user_id)
    .map((m) => ({
      label: memberDisplayName(m),
      id: m.user_id,
      isGroupOwner: m.role === "owner",
    }));
  return [{ label: "All members", id: "ALL", isGroupOwner: false }, ...rows];
});

const memberNameByUserId = computed(() => {
  const map = {};
  for (const m of props.members ?? []) {
    if (m?.user_id) map[m.user_id] = memberDisplayName(m);
  }
  return map;
});

const hasConfiguredCycle = computed(() => {
  const s = Math.floor(Number(props.cycleStartDay));
  const e = Math.floor(Number(props.cycleEndDay));
  return (
    Number.isFinite(s) &&
    s >= 1 &&
    s <= 31 &&
    Number.isFinite(e) &&
    e >= 1 &&
    e <= 31
  );
});

const cycleStartLabel = computed(() =>
  hasConfiguredCycle.value ? String(Math.floor(Number(props.cycleStartDay))) : "",
);
const cycleEndLabel = computed(() =>
  hasConfiguredCycle.value ? String(Math.floor(Number(props.cycleEndDay))) : "",
);

/** Calendar fallback: last 12 months, newest first (same ordering as statement menu). */
const calendarMonthMenu = (() => {
  const out = [];
  for (let i = 0; i < 12; i += 1) {
    const d = subMonths(new Date(), i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    out.push({
      start,
      end,
      id: format(start, "yyyy-MM"),
      label: format(start, "MMMM yyyy"),
    });
  }
  return out;
})();

const { data: rpcCycles, refresh: refreshCycles } = await useAsyncData(
  () => `group-cycles-rpc-${props.groupId}`,
  async () => {
    if (!import.meta.client) return [];
    const { data, error } = await supabase.rpc('get_group_cycles', {
      p_group_id: props.groupId,
      p_card_id: null
    });
    if (error) {
      console.error(error);
      return [];
    }
    return (data ?? []).map(x => x.billing_cycle_key);
  },
  { watch: [() => props.groupId] }
);

const allCycleMenuItems = computed(() => {
  if (hasConfiguredCycle.value) {
    const s = Math.floor(Number(props.cycleStartDay));
    const e = Math.floor(Number(props.cycleEndDay));
    return listCardStatementCycleMenuItems(s, e, 24, new Date());
  }
  return calendarMonthMenu;
});

const cycleMenuItems = computed(() => {
  const all = allCycleMenuItems.value;
  const keys = new Set(rpcCycles.value ?? []);
  return all.filter((item, index) => index === 0 || keys.has(item.id));
});

watch(
  () => cycleMenuItems.value.map((x) => x.id).join("|"),
  () => {
    const items = cycleMenuItems.value;
    if (!items.length) return;
    if (!items.some((i) => i.id === selectedPeriodId.value)) {
      selectedPeriodId.value = items[0].id;
    }
  },
  { immediate: true },
);

const selectedCycleRow = computed(
  () =>
    cycleMenuItems.value.find((x) => x.id === selectedPeriodId.value) ??
    cycleMenuItems.value[0],
);

const selectedCycleLabel = computed(() => selectedCycleRow.value?.label ?? "");

const currentPeriod = computed(() => {
  const c = selectedCycleRow.value;
  if (!c?.start || !c?.end) return { from: new Date(0), to: new Date(0) };
  return { from: c.start, to: c.end };
});



const {
  transactions: { all: currentAll },
  pending: pendingCurrent,
  refreshTransactions: refreshC,
} = await useFetchTransactions(currentPeriod, {
  scope: "group",
  groupId: computed(() => props.groupId),
});



const pending = computed(() => pendingCurrent.value);

const refreshData = () => {
  refreshC();
  refreshCycles();
};

const currentFiltered = computed(() =>
  filterTransactionsByUserId(currentAll.value, memberFilterUserId.value),
);


const currentSummary = computed(() =>
  summarizeTransactions(currentFiltered.value),
);


const filteredList = computed(() => currentFiltered.value);
const byDate = computed(() => groupTransactionsByDate(filteredList.value));

const filterNote = computed(() => {
  if (memberFilterUserId.value === "ALL") return null;
  const m = memberFilterItems.value.find(
    (x) => x.id === memberFilterUserId.value,
  );
  const label = selectedCycleLabel.value || "this period";
  return `Showing ${m?.label ?? "this member"} in ${label}.`;
});
</script>
