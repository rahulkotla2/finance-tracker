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
        repeats every month; no year or month is stored. Data is saved in this browser only.
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
      <p
        v-if="!list.length"
        class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400"
      >
        You have not saved any cards yet. The card below is a preview (same layout as a saved
        card)—it is not stored. Save your own in the form above to replace it.
      </p>

      <ul class="mt-4 grid gap-4 sm:grid-cols-2">
        <li v-for="card in cardsToShow" :key="card.id">
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
                v-if="!isPreviewCard(card)"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-trash-20-solid"
                :aria-label="`Remove ${card.name}`"
                class="shrink-0 -mt-0.5"
                @click="openDelete(card)"
              />
              <div
                v-else
                class="h-8 w-8 shrink-0"
                aria-hidden="true"
                title=""
              />
            </div>
          </UCard>
        </li>
      </ul>
    </div>

    <UModal v-model:open="deleteOpen" title="Remove this card?">
      <template #body>
        <p v-if="deleteTarget" class="text-sm text-gray-800 dark:text-gray-200">
          <span class="font-medium">“{{ deleteTarget.name }}”</span> will be removed from this
          list.
        </p>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          This does not change any group or transactions—only the saved details here in this
          browser.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <UButton color="neutral" variant="outline" label="Cancel" @click="deleteOpen = false" />
          <UButton color="error" variant="solid" label="Remove" @click="confirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { z } from "zod";

const { toastSuccess, toastError } = useAppToast();
const { list, add, remove, sync } = useCreditCards();
const formRef = ref();
const submitting = ref(false);
const deleteOpen = ref(false);
const deleteTarget = ref(null);

/** Shown when the list is empty; same fields as a saved card, not in localStorage. */
const PREVIEW_CARD_ID = "__credit-card-list-preview__";
const previewCard = {
  id: PREVIEW_CARD_ID,
  name: "Chase Sapphire, Joint Amex",
  cycleStartDay: 26,
  cycleEndDay: 5,
  paymentDueDay: 24,
  createdAt: null,
};

const cardsToShow = computed(() => (list.value.length > 0 ? list.value : [previewCard]));

function isPreviewCard(card) {
  return card?.id === PREVIEW_CARD_ID;
}

onMounted(() => {
  sync();
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

const onSubmit = () => {
  submitting.value = true;
  try {
    add({
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

function openDelete(card) {
  deleteTarget.value = card;
  deleteOpen.value = true;
}

function confirmDelete() {
  if (deleteTarget.value?.id) {
    remove(deleteTarget.value.id);
    toastSuccess({ title: "Card removed" });
  }
  deleteOpen.value = false;
  deleteTarget.value = null;
}

useHead({
  title: "Credit cards",
});
</script>
