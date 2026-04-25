<template>
  <div class="space-y-10">
    <div class="flex flex-col gap-2 mt-5">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-extrabold">Monthly group</h1>
        <UBadge color="neutral" variant="subtle">Demo</UBadge>
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
        Standard transactions only (no credit-card line types). Summary:
        <span class="font-medium text-gray-700 dark:text-gray-300">income</span>,
        <span class="font-medium text-gray-700 dark:text-gray-300">expenses</span>,
        <span class="font-medium text-gray-700 dark:text-gray-300">remaining</span> (income − expenses), and
        <span class="font-medium text-gray-700 dark:text-gray-300">taken to credit card</span> (expenses
        in category &quot;Credit card&quot;).
      </p>
    </div>

    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-wrap gap-3">
        <UFormField name="memberFilter" label="Member" class="min-w-48">
          <USelectMenu
            v-model="memberFilterUserId"
            value-key="id"
            :items="memberFilterItems"
            placeholder="All members"
            class="w-56"
          />
        </UFormField>
        <UFormField name="cycle" label="Cycle (calendar month)" class="min-w-64">
          <USelectMenu
            v-model="selectedCycleId"
            value-key="id"
            :items="cycleMenuItems"
            class="w-full min-w-64"
          />
        </UFormField>
      </div>
    </div>

    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 lg:gap-10">
      <Trend
        color="green"
        title="Income"
        :amount="metricsView.current.income"
        :last-amount="metricsView.previous.income"
        :loading="false"
      />
      <Trend
        color="red"
        title="Expenses"
        :amount="metricsView.current.expenses"
        :last-amount="metricsView.previous.expenses"
        :loading="false"
      />
      <Trend
        :color="metricsView.current.remaining >= 0 ? 'green' : 'red'"
        title="Remaining"
        :amount="metricsView.current.remaining"
        :last-amount="metricsView.previous.remaining"
        :loading="false"
      />
      <Trend
        color="red"
        title="Taken to credit card"
        :amount="metricsView.current.takenToCard"
        :last-amount="metricsView.previous.takenToCard"
        :loading="false"
      />
    </section>

    <section class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h2 class="text-lg font-bold">Activity</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          <template v-if="filterNote">{{ filterNote }}</template>
          <template v-else>All activity in the selected month.</template>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <TransactionModal
          v-model:isOpen="isAddOpen"
          :group-id="DEMO_GROUP_ID"
          is-demo
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
          :group-id="DEMO_GROUP_ID"
          :show-group-badge="false"
          show-owner-badge
          is-demo
        />
      </div>
    </section>
    <p
      v-else
      class="text-sm text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6"
    >
      No transactions in this month for this filter.
    </p>
  </div>
</template>

<script setup>
import {
  addDays,
  endOfMonth,
  format,
  isWithinInterval,
  startOfMonth,
  subMonths,
} from "date-fns";
import { groupTransactionsByDate, filterTransactionsByUserId } from "~/utils/transactions";

const CC_CATEGORY = "Credit card";

const DEMO_GROUP_ID = "00000000-0000-0000-0000-00000000m001";
const isAddOpen = ref(false);
const memberFilterUserId = ref("ALL");

const memberFilterItems = [
  { label: "All members", id: "ALL" },
  { label: "Alex", id: "u-alex" },
  { label: "Jordan", id: "u-jordan" },
  { label: "Sam", id: "u-sam" },
];

const ownerId = "u-alex";
const jordanId = "u-jordan";
const samId = "u-sam";

const profile = (id) => {
  const map = {
    [ownerId]: { full_name: "Alex" },
    [jordanId]: { full_name: "Jordan" },
    [samId]: { full_name: "Sam" },
  };
  return map[id] ? { full_name: map[id].full_name } : { full_name: "Member" };
};

function strHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) / 2147483647;
}

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {string} yyyyMm e.g. 2026-03
 */
function monthBounds(yyyyMm) {
  const d0 = new Date(`${yyyyMm}-01T12:00:00`);
  return { start: startOfMonth(d0), end: endOfMonth(d0) };
}

const monthList = (() => {
  const out = [];
  for (let i = 0; i < 12; i += 1) {
    const d = subMonths(new Date(), i);
    const start = startOfMonth(d);
    out.push({
      start,
      end: endOfMonth(d),
      id: format(start, "yyyy-MM"),
      label: format(start, "MMMM yyyy"),
    });
  }
  return out;
})();

const cycleMenuItems = monthList.map((c) => ({ id: c.id, label: c.label }));
const selectedCycleId = ref(monthList[0]?.id ?? format(new Date(), "yyyy-MM"));
const selectedCycle = computed(
  () => monthList.find((c) => c.id === selectedCycleId.value) ?? monthList[0],
);

const previousCycle = computed(() => {
  const d = startOfMonth(new Date(`${selectedCycleId.value}-01T12:00:00`));
  return subMonths(d, 1);
});
const previousCycleId = computed(() => format(previousCycle.value, "yyyy-MM"));

const previousBounds = computed(() => {
  const id = previousCycleId.value;
  if (!id) return null;
  return monthBounds(id);
});

/**
 * @param {string} cycleId yyyy-MM
 * @param {string | null} userForAmountBias optional — vary amounts by member filter for a stable story
 */
function buildDemoTransactionsForMonth(cycleId) {
  const { start, end } = monthBounds(cycleId);
  const h = strHash(`mo-${cycleId}`);
  const sc = 0.9 + 0.18 * h;
  const day = (n) => {
    const t = addDays(start, n);
    return t > end ? end : t;
  };
  const at = (d) => `${format(d, "yyyy-MM-dd")}T12:00:00`;
  return [
    {
      id: `${cycleId}-i1`,
      type: "Income",
      amount: r2(5200 * sc),
      description: "Salary",
      category: "Other",
      user_id: ownerId,
      group_id: DEMO_GROUP_ID,
      profiles: profile(ownerId),
      created_at: at(day(2)),
    },
    {
      id: `${cycleId}-i2`,
      type: "Income",
      amount: r2(420 * sc),
      description: "Freelance",
      category: "Other",
      user_id: jordanId,
      group_id: DEMO_GROUP_ID,
      profiles: profile(jordanId),
      created_at: at(day(4)),
    },
    {
      id: `${cycleId}-e1`,
      type: "Expense",
      amount: r2(1280 * sc),
      description: "Rent (share)",
      category: "Housing",
      user_id: jordanId,
      group_id: DEMO_GROUP_ID,
      profiles: profile(jordanId),
      created_at: at(day(1)),
    },
    {
      id: `${cycleId}-e2`,
      type: "Expense",
      amount: r2(95 * sc),
      description: "Groceries",
      category: "Food",
      user_id: samId,
      group_id: DEMO_GROUP_ID,
      profiles: profile(samId),
      created_at: at(day(5)),
    },
    {
      id: `${cycleId}-e3`,
      type: "Expense",
      amount: r2(60 * sc),
      description: "Phone & utilities",
      category: "Utilities",
      user_id: ownerId,
      group_id: DEMO_GROUP_ID,
      profiles: profile(ownerId),
      created_at: at(day(8)),
    },
    {
      id: `${cycleId}-cc1`,
      type: "Expense",
      amount: r2(520 * sc),
      description: "Checking → card (autopay)",
      category: CC_CATEGORY,
      user_id: ownerId,
      group_id: DEMO_GROUP_ID,
      profiles: profile(ownerId),
      created_at: at(day(3)),
    },
    {
      id: `${cycleId}-cc2`,
      type: "Expense",
      amount: r2(150 * sc),
      description: "Card payoff (extra)",
      category: CC_CATEGORY,
      user_id: jordanId,
      group_id: DEMO_GROUP_ID,
      profiles: profile(jordanId),
      created_at: at(day(14)),
    },
    {
      id: `${cycleId}-s1`,
      type: "Saving",
      amount: r2(300 * sc),
      description: "Savings transfer",
      category: "Other",
      user_id: jordanId,
      group_id: DEMO_GROUP_ID,
      profiles: profile(jordanId),
      created_at: at(day(18)),
    },
  ];
}

const rawThisMonth = computed(() => buildDemoTransactionsForMonth(selectedCycleId.value));
const rawPreviousMonth = computed(() => buildDemoTransactionsForMonth(previousCycleId.value));

/** In-period list (month boundaries), then member filter. */
function inMonth(list, c, userId) {
  if (!c) return filterTransactionsByUserId([], userId);
  const inP = (t) => {
    const t0 = new Date(t.created_at);
    return isWithinInterval(t0, { start: c.start, end: c.end });
  };
  return filterTransactionsByUserId((list ?? []).filter(inP), userId);
}

function summarizeMonthly(list) {
  const L = list ?? [];
  const income = L.filter((t) => t.type === "Income").reduce((a, t) => a + t.amount, 0);
  const expenses = L.filter((t) => t.type === "Expense").reduce((a, t) => a + t.amount, 0);
  const takenToCard = L.filter(
    (t) => t.type === "Expense" && t.category === CC_CATEGORY,
  ).reduce((a, t) => a + t.amount, 0);
  return {
    income: r2(income),
    expenses: r2(expenses),
    remaining: r2(income - expenses),
    takenToCard: r2(takenToCard),
  };
}

const toPrevious = (cur, r = 0.94) => {
  if (!cur) return { income: 0, expenses: 0, remaining: 0, takenToCard: 0 };
  return {
    income: r2((cur.income ?? 0) * r),
    expenses: r2((cur.expenses ?? 0) * r),
    remaining: r2((cur.remaining ?? 0) * r),
    takenToCard: r2((cur.takenToCard ?? 0) * r),
  };
};

const metricsView = computed(() => {
  const c = selectedCycle.value;
  const uid = memberFilterUserId.value;
  const cur = summarizeMonthly(
    inMonth(rawThisMonth.value, c ? { start: c.start, end: c.end } : null, uid),
  );
  const bounds = previousBounds.value;
  const prev = bounds
    ? summarizeMonthly(inMonth(rawPreviousMonth.value, { start: bounds.start, end: bounds.end }, uid))
    : toPrevious(cur);
  return { current: cur, previous: prev };
});

const filteredList = computed(() => {
  const c = selectedCycle.value;
  if (!c) return [];
  return inMonth(rawThisMonth.value, { start: c.start, end: c.end }, memberFilterUserId.value);
});

const byDate = computed(() => groupTransactionsByDate(filteredList.value));

const filterNote = computed(() => {
  if (memberFilterUserId.value === "ALL") return null;
  const m = memberFilterItems.find((x) => x.id === memberFilterUserId.value);
  return `Showing ${m?.label ?? "this member"}’s transactions for ${selectedCycle.value?.label ?? "this month"}.`;
});

useHead({
  title: "Monthly group (demo) · Group",
});
</script>
