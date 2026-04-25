<template>
  <div class="space-y-10">
    <div class="flex flex-col gap-3 mt-5">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-3xl font-extrabold">Credit card expenses</h1>
      </div>
      <div class="flex flex-wrap items-end justify-between gap-3 mt-2">
        <div class="flex gap-3">
          <UFormField name="memberFilter" label="Member" class="min-w-48">
            <USelectMenu
              v-model="memberFilterUserId"
              value-key="id"
              :items="memberFilterItems"
              placeholder="All members"
              class="w-56"
            />
          </UFormField>
          <UFormField name="cardFilter" label="Card">
            <USelectMenu
              v-model="selectedCardId"
              value-key="id"
              :items="dummyCards"
              placeholder="Select card"
              class="w-48"
            />
          </UFormField>
        </div>
        <UFormField name="statementCycle" label="Statement" class="min-w-64">
          <USelectMenu
            v-model="selectedCycleId"
            value-key="id"
            :items="cycleMenuItems"
            class="w-full min-w-64"
          />
        </UFormField>
      </div>
    </div>

    <!-- All members: aggregate + liquidity -->
    <section
      v-if="memberFilterUserId === 'ALL'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 lg:gap-10"
    >
      <Trend
        color="red"
        title="Total Spends"
        :amount="allMembersView.spent"
        :loading="false"
      />
      <Trend
        :color="allMembersView.saved < 0 ? 'text-amber-600 dark:text-amber-400' : 'green'"
        title="Total Saved"
        :amount="allMembersView.saved"
        :loading="false"
      />
      <Trend
        color="green"
        title="Available to Repay"
        :amount="allMembersView.availableToPayCard"
        :loading="false"
      />
      <Trend
        color="red"
        title="Debt (spent - saved)"
        :amount="allMembersView.debtDepth"
        :loading="false"
      />
    </section>

    <!-- Card owner: Alex’s perspective as payer -->
    <section
      v-else-if="memberFilterUserId === ownerId"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-10 lg:gap-14"
    >
      <Trend
        color="red"
        title="Your Spends"
        :amount="ownerAsMemberView.mySpent"
        :loading="false"
      />
      <Trend
        :color="ownerAsMemberView.mySaved < 0 ? 'text-amber-600 dark:text-amber-400' : 'green'"
        title="Your Savings"
        :amount="ownerAsMemberView.mySaved"
        :loading="false"
      />
      <Trend
        color="text-amber-600 dark:text-amber-400"
        title="Due from Others"
        :amount="ownerAsMemberView.shouldGetFromOthers"
        :loading="false"
      />
      <Trend
        color="green"
        title="Received from Others"
        :amount="ownerAsMemberView.gotFromOthers"
        :loading="false"
      />
    </section>

    <!-- Non-owner: one member's view -->
    <section
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-10 lg:gap-14"
    >
      <Trend
        color="red"
        title="Expenses"
        :amount="nonOwnerView.spent"
        :loading="false"
      />
      <Trend
        :color="nonOwnerView.saved < 0 ? 'text-amber-600 dark:text-amber-400' : 'green'"
        title="Savings"
        :amount="nonOwnerView.saved"
        :loading="false"
      />
      <Trend
        color="green"
        title="Paid"
        :amount="nonOwnerView.paidToOwner"
        :loading="false"
      />
      <Trend
        color="red"
        title="Owed"
        :amount="nonOwnerView.stillOwesOwner"
        :loading="false"
      />
    </section>

    <section class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h2 class="text-lg font-bold">Activity</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          <template v-if="filterNote">{{ filterNote }}</template>
          <template v-else
            >Charges on the selected card in this period.</template
          >
        </p>
      </div>
      <div class="flex items-center gap-2">
        <TransactionModal
          v-model:isOpen="isAddOpen"
          :group-id="DEMO_GROUP_ID"
          is-demo
          credit-card
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
        <DailyTransactionSummary
          :date="String(date)"
          :transactions="dayTx"
          credit-line-net
        />
        <Transaction
          v-for="t in dayTx"
          :key="t.id"
          :transaction="t"
          :group-id="DEMO_GROUP_ID"
          :show-group-badge="false"
          show-owner-badge
          is-demo
          credit-line
        />
      </div>
    </section>
    <p
      v-else
      class="text-sm text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6"
    >
      No charges in this statement. Sample data is only generated for a few
      periods; pick another month or
      <button
        type="button"
        class="text-blue-600 dark:text-blue-400 font-medium"
        @click="selectedCycleId = referenceCycleId"
      >
        go to the reference period
      </button>
      to preview the list.
    </p>
  </div>
</template>

<script setup>
import {
  addDays,
  addMonths,
  endOfDay,
  format,
  isWithinInterval,
  setDate,
  startOfDay,
  subMonths,
} from "date-fns";
import { isCcSpend } from "~/utils/creditCardTransaction";
import {
  groupTransactionsByDate,
  filterTransactionsByUserId,
} from "~/utils/transactions";

const ANCHOR_DAY = 25;
const DEMO_GROUP_ID = "00000000-0000-0000-0000-00000000cc00";

const isAddOpen = ref(false);

const selectedCardId = ref("card-1");
const memberFilterUserId = ref("ALL");

const dummyCards = [
  { label: "Chase · Shared (Alex)", id: "card-1" },
  { label: "Amex (Alex)", id: "card-2" },
];

const memberFilterItems = [
  { label: "All members", id: "ALL" },
  { label: "Alex (card owner)", id: "u-alex" },
  { label: "Jordan", id: "u-jordan" },
  { label: "Sam", id: "u-sam" },
];

const ownerId = "u-alex";
const jordanId = "u-jordan";
const samId = "u-sam";

/**
 * @param {Date} d
 * @returns {{ start: Date, end: Date, id: string, label: string }}
 */
function cycleForDate(d) {
  const day = d.getDate();
  const start =
    day >= ANCHOR_DAY
      ? startOfDay(setDate(d, ANCHOR_DAY))
      : startOfDay(setDate(subMonths(d, 1), ANCHOR_DAY));
  const end = endOfDay(setDate(addMonths(start, 1), ANCHOR_DAY));
  return {
    start,
    end,
    id: format(start, "yyyy-MM-dd"),
    label: `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`,
  };
}

/**
 * The statement that ends the day the current one begins (e.g. Feb 25 – Mar 25
 * before the Mar 25 – Apr 25 block).
 * @param {{ start: Date, end: Date }} c
 */
function getPreviousStatement(c) {
  const end = endOfDay(c.start);
  const start = startOfDay(subMonths(c.start, 1));
  return {
    start,
    end,
    id: format(start, "yyyy-MM-dd"),
    label: `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`,
  };
}

/** Next block after c (e.g. after Mar 25 – Apr 25: Apr 25 – May 25). */
function getNextStatement(c) {
  const start = startOfDay(setDate(addMonths(c.start, 1), ANCHOR_DAY));
  const end = endOfDay(setDate(addMonths(c.start, 2), ANCHOR_DAY));
  return {
    start,
    end,
    id: format(start, "yyyy-MM-dd"),
    label: `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`,
  };
}

const currentCycle = cycleForDate(new Date());
const older = (() => {
  const out = [currentCycle];
  let c = currentCycle;
  for (let i = 0; i < 11; i += 1) {
    c = getPreviousStatement(c);
    out.push(c);
  }
  return out;
})();

const nextCycle = getNextStatement(currentCycle);
const allCycles = [nextCycle, ...older];
const byId = new Map();
for (const c of allCycles) {
  if (!byId.has(c.id)) byId.set(c.id, c);
}
const statementCycleList = [...byId.values()].sort((a, b) => b.start - a.start);

const selectedCycleId = ref(currentCycle.id);
const referenceCycleId = currentCycle.id;

const cycleMenuItems = statementCycleList.map((c) => ({
  id: c.id,
  label: c.label,
}));

const selectedCycle = computed(() => {
  const c = statementCycleList.find((x) => x.id === selectedCycleId.value);
  return c ?? currentCycle;
});

const rawDemoTransactions = computed(() => {
  const c = selectedCycle.value;
  if (!c?.start || !c?.end) return [];
  const d1 = addDays(c.start, 2);
  const d2 = addDays(c.start, 6);
  const d3 = addDays(c.end, -10);
  const d4 = addDays(c.end, -3);

  const ymd = (dt) => format(dt, "yyyy-MM-dd");
  const cid = c.id;
  return [
    {
      id: `${cid}-t1`,
      type: "expense",
      subtype: null,
      amount: 89.2,
      description: "Groceries (split)",
      created_at: `${ymd(d1)}T10:00:00`,
      category: "Food",
      user_id: jordanId,
      group_id: DEMO_GROUP_ID,
      profiles: { full_name: "Jordan" },
    },
    {
      id: `${cid}-t2`,
      type: "expense",
      subtype: null,
      amount: 45,
      description: "Transit",
      created_at: `${ymd(d2)}T11:20:00`,
      category: "Transportation",
      user_id: samId,
      group_id: DEMO_GROUP_ID,
      profiles: { full_name: "Sam" },
    },
    {
      id: `${cid}-t3`,
      type: "expense",
      subtype: null,
      amount: 312.5,
      description: "Utilities & housing share",
      created_at: `${ymd(d3)}T09:15:00`,
      category: "Housing",
      user_id: jordanId,
      group_id: DEMO_GROUP_ID,
      profiles: { full_name: "Jordan" },
    },
    {
      id: `${cid}-t4`,
      type: "expense",
      subtype: null,
      amount: 128.99,
      description: "Dinner (group)",
      created_at: `${ymd(d4)}T20:00:00`,
      category: "Entertainment",
      user_id: ownerId,
      group_id: DEMO_GROUP_ID,
      profiles: { full_name: "Alex" },
    },
    {
      id: `${cid}-r1`,
      type: "expense",
      subtype: "reserve",
      amount: 50,
      description: "Savings for card (Jordan)",
      created_at: `${ymd(d2)}T14:00:00`,
      user_id: jordanId,
      group_id: DEMO_GROUP_ID,
      profiles: { full_name: "Jordan" },
    },
    {
      id: `${cid}-s1`,
      type: "expense",
      subtype: "payment",
      amount: 35,
      description: "Partial pay to owner",
      created_at: `${ymd(d1)}T16:00:00`,
      user_id: jordanId,
      group_id: DEMO_GROUP_ID,
      profiles: { full_name: "Jordan" },
    },
  ];
});

const cardNudge = computed(() => (selectedCardId.value === "card-2" ? 0.4 : 1));

/** Deterministic 0.85–1.1 from cycle id (stable scaling for demo numbers) */
function strHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) / 2147483647;
}

const scaleForCycle = (id) =>
  0.86 + 0.24 * strHash(`cc-${id}-${selectedCardId.value}`);

const r2 = (n) => Math.round(n * 100) / 100;

/** Total the owner should get back from other members (their share) this period */
const totalDueFromNonOwners = computed(() => {
  const cId = selectedCycleId.value;
  const sc = scaleForCycle(cId) * cardNudge.value;
  return r2(1200 * sc);
});

const settlementRows = computed(() => {
  const t = totalDueFromNonOwners.value;
  const jShare = r2(t * 0.55);
  const sShare = r2(t - jShare);
  const jPayCap = 150 + 30 * strHash("pay-jordan");
  const sPayCap = 95 + 25 * strHash("pay-sam");
  const jPaid = r2(Math.min(jShare, 0.65 * jShare, jPayCap));
  const sPaid = r2(Math.min(sShare, 0.6 * sShare, sPayCap));
  return [
    {
      name: "Jordan",
      userId: jordanId,
      owed: jShare,
      paid: jPaid,
      pending: Math.max(0, r2(jShare - jPaid)),
    },
    {
      name: "Sam",
      userId: samId,
      owed: sShare,
      paid: sPaid,
      pending: Math.max(0, r2(sShare - sPaid)),
    },
  ];
});

const byUserSpent = computed(() => {
  const map = { [ownerId]: 0, [jordanId]: 0, [samId]: 0 };
  for (const t of rawDemoTransactions.value ?? []) {
    if (isCcSpend(t) && t.user_id) {
      map[t.user_id] = (map[t.user_id] ?? 0) + t.amount;
    }
  }
  return map;
});

/** "Saved to repay" (demo) — set aside, not the same as app Saving type */
const byUserSaved = computed(() => {
  const cId = selectedCycleId.value;
  const sc = scaleForCycle(cId) * cardNudge.value;
  return {
    [ownerId]: r2(420 * sc),
    [jordanId]: r2(62 * sc),
    [samId]: r2(44 * sc),
  };
});

const allMembersView = computed(() => {
  const s = byUserSpent.value;
  const sv = byUserSaved.value;
  const fromOthers = r2(
    (settlementRows.value ?? []).reduce((a, b) => a + (b.paid ?? 0), 0),
  );
  // Cash that can go toward the bill: what the owner set aside + what
  // other members have already sent to the owner for this card.
  const availableToPayCard = r2((sv[ownerId] ?? 0) + fromOthers);
  const spent = r2(s[ownerId] + s[jordanId] + s[samId]);
  const saved = r2(sv[ownerId] + sv[jordanId] + sv[samId]);
  return {
    spent,
    saved,
    availableToPayCard,
    debtDepth: r2(spent - Math.max(0, saved)),
  };
});

const ownerAsMemberView = computed(() => {
  const s = byUserSpent.value;
  const sv = byUserSaved.value;
  const rows = settlementRows.value;
  const shouldGetFromOthers = r2(rows.reduce((a, b) => a + b.pending, 0));
  const gotFromOthers = r2(rows.reduce((a, b) => a + b.paid, 0));
  return {
    mySpent: r2(s[ownerId] ?? 0),
    mySaved: r2(sv[ownerId] ?? 0),
    shouldGetFromOthers,
    gotFromOthers,
  };
});

const nonOwnerView = computed(() => {
  const id = memberFilterUserId.value;
  const s = byUserSpent.value;
  const sv = byUserSaved.value;
  const row = settlementRows.value.find((r) => r.userId === id);
  return {
    spent: r2(s[id] ?? 0),
    saved: r2(sv[id] ?? 0),
    paidToOwner: r2(row?.paid ?? 0),
    stillOwesOwner: r2(row?.pending ?? 0),
  };
});

const filteredList = computed(() => {
  const c = selectedCycle.value;
  const inPeriod = (t) => {
    const t0 = new Date(t.created_at);
    return isWithinInterval(t0, { start: c.start, end: c.end });
  };
  return filterTransactionsByUserId(
    (rawDemoTransactions.value ?? []).filter(inPeriod),
    memberFilterUserId.value,
  );
});

const byDate = computed(() => groupTransactionsByDate(filteredList.value));

const filterNote = computed(() => {
  if (memberFilterUserId.value === "ALL") return null;
  if (memberFilterUserId.value === ownerId) {
    return "Card owner view: the summary is yours; the list is your charges on this card.";
  }
  const m = memberFilterItems.find((x) => x.id === memberFilterUserId.value);
  return `Summary and list for ${m?.label ?? "this member"}: their share of this period.`;
});

useHead({
  title: "Credit card (demo) · Group",
});
</script>
