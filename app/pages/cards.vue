<template>
  <div class="space-y-8">
    <div>
      <NuxtLink
        to="/"
        class="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
      >
        ← Summary
      </NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-gray-900 dark:text-white">Credit cards</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Each billing field is a
        <span class="font-medium text-gray-700 dark:text-gray-300">day of the month (1–31)</span> only. It
        repeats every month; no year or month is stored. Cards are stored in your account.
      </p>
    </div>

    <UCard :ui="{ body: 'sm:p-6' }">
      <template #header>
        <div class="flex items-center gap-2">
          <div
            class="flex size-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
          >
            <UIcon name="i-heroicons-plus-20-solid" class="size-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">Add a card</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Pick a name and the three calendar days.</p>
          </div>
        </div>
      </template>
      <UForm :state="form" :schema="formSchema" @submit="onSubmit" class="space-y-6" ref="formRef">
        <UFormField label="Card name" name="name" :required="true" class="w-full max-w-md">
          <UInput
            v-model="form.name"
            placeholder="e.g. Chase Sapphire, Joint Amex"
            class="w-full"
          />
        </UFormField>
        <div class="grid gap-6 sm:grid-cols-3">
          <UFormField
            label="Billing cycle start (day)"
            name="cycleStartDay"
            :required="true"
          >
            <DayOfMonthPicker v-model="form.cycleStartDay" title="Start" />
          </UFormField>
          <UFormField
            label="Billing cycle end (day)"
            name="cycleEndDay"
            :required="true"
          >
            <DayOfMonthPicker v-model="form.cycleEndDay" title="End" />
          </UFormField>
          <UFormField
            label="Payment due (day)"
            name="paymentDueDay"
            :required="true"
          >
            <DayOfMonthPicker v-model="form.paymentDueDay" title="Due" />
          </UFormField>
        </div>
        <UButton
          type="submit"
          color="neutral"
          variant="solid"
          label="Save card"
          :loading="submitting"
          :disabled="submitting"
          leading-icon="i-heroicons-check-20-solid"
        />
      </UForm>
    </UCard>

    <div>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Your cards</h2>

      <UCard
        v-if="loading"
        class="mt-4"
        :ui="{ body: 'flex min-h-40 items-center justify-center gap-2 py-8' }"
      >
        <UIcon
          name="i-heroicons-arrow-path-20-solid"
          class="size-5 shrink-0 animate-spin text-gray-400"
        />
        <span class="text-sm text-gray-500 dark:text-gray-400">Loading cards…</span>
      </UCard>

      <UTabs v-else v-model="cardsTab" :items="cardTabItems" class="mt-4">
        <template #active-cards>
          <div class="pt-2">
            <ul v-if="activeCards.length" class="grid gap-4 sm:grid-cols-2">
              <li v-for="card in activeCards" :key="card.id">
                <UCard :ui="cardListUi">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex min-w-0 items-start gap-3">
                      <div
                        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gray-800 to-gray-600 text-white dark:from-gray-700 dark:to-gray-500"
                      >
                        <UIcon name="i-heroicons-credit-card-20-solid" class="size-5" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <h3 class="font-semibold text-gray-900 dark:text-white">
                          {{ card.name }}
                        </h3>
                        <dl class="mt-3 space-y-2.5 text-sm">
                          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <dt class="shrink-0 text-gray-500 dark:text-gray-400">Cycle</dt>
                            <dd class="min-w-0 text-gray-800 dark:text-gray-200">
                              {{ formatCycle(card.cycleStartDay, card.cycleEndDay) }}
                            </dd>
                          </div>
                          <div class="flex flex-wrap items-center gap-x-2">
                            <dt class="shrink-0 text-gray-500 dark:text-gray-400">Payment due</dt>
                            <dd>
                              <UBadge color="warning" variant="subtle" class="tabular-nums">
                                {{ ordinalDay(card.paymentDueDay) }}
                              </UBadge>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-x-circle-20-solid"
                      :aria-label="`Deactivate ${card.name}`"
                      class="shrink-0 -mt-0.5"
                      @click="openDeactivate(card)"
                    />
                  </div>
                </UCard>
              </li>
            </ul>
            <UCard
              v-else
              :ui="{
                body: 'flex min-h-32 flex-col items-center justify-center gap-1 px-4 py-10 text-center',
              }"
            >
              <div
                class="flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
              >
                <UIcon name="i-heroicons-credit-card-20-solid" class="size-6" />
              </div>
              <p class="mt-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                No active cards
              </p>
              <p class="max-w-sm text-sm text-gray-500 dark:text-gray-400">
                Add a card with the form above to see it here.
              </p>
            </UCard>
          </div>
        </template>
        <template #inactive-cards>
          <div class="pt-2">
            <ul v-if="inactiveCards.length" class="grid gap-4 sm:grid-cols-2">
              <li v-for="card in inactiveCards" :key="card.id">
                <UCard
                  :ui="{
                    root: 'opacity-90 ring-1 ring-gray-200/80 dark:ring-gray-800',
                    body: 'p-5',
                  }"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex min-w-0 items-start gap-3">
                      <div
                        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      >
                        <UIcon name="i-heroicons-credit-card-20-solid" class="size-5" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <h3 class="font-semibold text-gray-900 dark:text-white">
                            {{ card.name }}
                          </h3>
                          <UBadge color="neutral" variant="subtle" size="sm">Inactive</UBadge>
                        </div>
                        <dl class="mt-3 space-y-2.5 text-sm">
                          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <dt class="shrink-0 text-gray-500 dark:text-gray-400">Cycle</dt>
                            <dd class="min-w-0 text-gray-700 dark:text-gray-300">
                              {{ formatCycle(card.cycleStartDay, card.cycleEndDay) }}
                            </dd>
                          </div>
                          <div class="flex flex-wrap items-center gap-x-2">
                            <dt class="shrink-0 text-gray-500 dark:text-gray-400">Payment due</dt>
                            <dd>
                              <UBadge color="neutral" variant="subtle" class="tabular-nums">
                                {{ ordinalDay(card.paymentDueDay) }}
                              </UBadge>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    <UButton
                      color="primary"
                      variant="soft"
                      size="sm"
                      label="Restore"
                      :loading="restoringId === card.id"
                      :disabled="!!restoringId"
                      :aria-label="`Restore ${card.name}`"
                      class="shrink-0 -mt-0.5"
                      @click="onRestoreCard(card)"
                    />
                  </div>
                </UCard>
              </li>
            </ul>
            <UCard
              v-else
              :ui="{
                body: 'flex min-h-32 flex-col items-center justify-center gap-1 px-4 py-10 text-center',
              }"
            >
              <div
                class="flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
              >
                <UIcon name="i-heroicons-archive-box-20-solid" class="size-6" />
              </div>
              <p class="mt-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                No inactive cards
              </p>
              <p class="max-w-sm text-sm text-gray-500 dark:text-gray-400">
                Deactivated cards appear here. You can restore one anytime.
              </p>
            </UCard>
          </div>
        </template>
      </UTabs>
    </div>

    <UModal v-model:open="deleteOpen" title="Move this card to Inactive?">
      <template #body>
        <p v-if="deleteTarget" class="text-sm text-gray-800 dark:text-gray-200">
          <span class="font-medium">“{{ deleteTarget.name }}”</span> will be marked inactive. You
          can find it in the
          <span class="font-medium">Inactive cards</span> tab and restore it there anytime.
        </p>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          This does not change any group or transactions—only whether this card is active for you.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            label="Cancel"
            :disabled="deleting"
            @click="deleteOpen = false"
          />
          <UButton
            color="error"
            variant="solid"
            label="Make inactive"
            :loading="deleting"
            :disabled="deleting"
            @click="confirmDeactivate"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { z } from "zod";

const { toastSuccess, toastError } = useAppToast();
const { activeCards, inactiveCards, loading, load, add, remove, restore } = useCreditCards();
const formRef = ref();
const submitting = ref(false);
const deleteOpen = ref(false);
const deleteTarget = ref(null);
const deleting = ref(false);
const cardsTab = ref("active");
const restoringId = ref(null);

const cardTabItems = computed(() => [
  {
    value: "active",
    label: "Active cards",
    icon: "i-heroicons-credit-card-20-solid",
    slot: "active-cards",
    badge: activeCards.value.length,
  },
  {
    value: "inactive",
    label: "Inactive cards",
    icon: "i-heroicons-archive-box-20-solid",
    slot: "inactive-cards",
    badge: inactiveCards.value.length,
  },
]);

onMounted(async () => {
  try {
    await load();
  } catch (e) {
    toastError({ title: "Could not load cards", description: e?.message ?? "Try again" });
  }
});

const cardListUi = {
  root: "ring-1 ring-gray-200/80 dark:ring-gray-800 shadow-sm",
  body: "p-5",
};

const form = ref({
  name: "",
  cycleStartDay: 1,
  cycleEndDay: 1,
  paymentDueDay: 1,
});

const formSchema = z.object({
  name: z.string().min(1, "Enter a card name"),
  cycleStartDay: z.coerce
    .number()
    .int("Use a day from 1 to 31")
    .min(1)
    .max(31),
  cycleEndDay: z.coerce.number().int().min(1).max(31),
  paymentDueDay: z.coerce.number().int().min(1).max(31),
});

const onSubmit = async () => {
  submitting.value = true;
  try {
    await add({
      name: form.value.name,
      cycleStartDay: form.value.cycleStartDay,
      cycleEndDay: form.value.cycleEndDay,
      paymentDueDay: form.value.paymentDueDay,
    });
    toastSuccess({ title: "Card saved" });
    form.value = { name: "", cycleStartDay: 1, cycleEndDay: 1, paymentDueDay: 1 };
    formRef.value?.clear?.();
  } catch (e) {
    toastError({ title: "Could not save", description: e?.message ?? "Try again" });
  } finally {
    submitting.value = false;
  }
};

/**
 * 1st, 2nd, … 31st
 */
function ordinalDay(n) {
  const d = Math.floor(Number(n)) || 1;
  if (d < 1) return "—";
  if (d > 31) return "31st";
  if (d % 10 === 1 && d !== 11) return `${d}st`;
  if (d % 10 === 2 && d !== 12) return `${d}nd`;
  if (d % 10 === 3 && d !== 13) return `${d}rd`;
  return `${d}th`;
}

/**
 * e.g. "25th → 5th (spans to next month)" if end < start, else "5th – 20th"
 */
function formatCycle(start, end) {
  const a = Math.min(31, Math.max(1, Math.floor(Number(start)) || 1));
  const b = Math.min(31, Math.max(1, Math.floor(Number(end)) || 1));
  if (a === b) return `${ordinalDay(a)} only`;
  if (b < a) {
    return `${ordinalDay(a)} → ${ordinalDay(b)} (next month)`;
  }
  return `${ordinalDay(a)} – ${ordinalDay(b)}`;
}

function openDeactivate(card) {
  deleteTarget.value = card;
  deleteOpen.value = true;
}

async function onRestoreCard(card) {
  if (!card?.id) return;
  restoringId.value = card.id;
  try {
    await restore(card.id);
    toastSuccess({
      title: "Card is active again",
      description: "The card is back in your active list.",
    });
    cardsTab.value = "active";
  } catch (e) {
    toastError({ title: "Could not restore card", description: e?.message ?? "Try again" });
  } finally {
    restoringId.value = null;
  }
}

async function confirmDeactivate() {
  const id = deleteTarget.value?.id;
  if (!id) {
    deleteOpen.value = false;
    deleteTarget.value = null;
    return;
  }

  deleting.value = true;
  try {
    await remove(id);
    toastSuccess({
      title: "Card is now inactive",
      description: "View or restore it under the Inactive cards tab.",
    });
    deleteOpen.value = false;
    deleteTarget.value = null;
    cardsTab.value = "inactive";
  } catch (e) {
    toastError({ title: "Could not update card", description: e?.message ?? "Try again" });
  } finally {
    deleting.value = false;
  }
}

useHead({
  title: "Credit cards",
});
</script>
