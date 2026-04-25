function dayPart(n) {
  const d = Math.floor(Number(n));
  if (!Number.isFinite(d) || d < 1) return 1;
  if (d > 31) return 31;
  return d;
}

/** @param {Record<string, unknown>} row */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: String(row.name ?? "").trim(),
    cycleStartDay: dayPart(row.billing_cycle_start_day),
    cycleEndDay: dayPart(row.billing_cycle_end_day),
    paymentDueDay: dayPart(row.payment_due_day),
    createdAt: row.created_at ?? null,
    isDeleted: row.is_deleted === true,
  };
}

/**
 * User credit cards (billing as day-of-month 1–31). Backed by Supabase `credit_cards`.
 */
export const useCreditCards = () => {
  const supabase = useSupabaseClient();
  const list = useState("credit-cards-store", () => []);
  const loading = ref(false);

  const activeCards = computed(() =>
    (list.value ?? []).filter((c) => !c.isDeleted),
  );
  const inactiveCards = computed(() =>
    (list.value ?? []).filter((c) => c.isDeleted),
  );

  async function load() {
    if (!import.meta.client) return;
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      list.value = (data ?? []).map((r) => mapRow(r)).filter(Boolean);
    } finally {
      loading.value = false;
    }
  }

  /**
   * @param {object} row
   * @param {string} [row.name]
   * @param {number} [row.cycleStartDay]
   * @param {number} [row.cycleEndDay]
   * @param {number} [row.paymentDueDay]
   */
  async function add(row) {
    const payload = {
      name: String(row.name ?? "").trim(),
      billing_cycle_start_day: dayPart(row.cycleStartDay),
      billing_cycle_end_day: dayPart(row.cycleEndDay),
      payment_due_day: dayPart(row.paymentDueDay),
      is_deleted: false,
    };
    const { data, error } = await supabase.from("credit_cards").insert([payload]).select();

    if (error) throw error;
    const entry = mapRow(data?.[0]);
    if (entry) {
      list.value = [entry, ...(list.value ?? []).filter((c) => c.id !== entry.id)];
    } else {
      await load();
    }
    return entry;
  }

  async function remove(id) {
    const { error } = await supabase
      .from("credit_cards")
      .update({ is_deleted: true })
      .eq("id", id);
    if (error) throw error;
    list.value = (list.value ?? []).map((c) =>
      c.id === id ? { ...c, isDeleted: true } : c,
    );
  }

  async function restore(id) {
    const { error } = await supabase
      .from("credit_cards")
      .update({ is_deleted: false })
      .eq("id", id);
    if (error) throw error;
    list.value = (list.value ?? []).map((c) =>
      c.id === id ? { ...c, isDeleted: false } : c,
    );
  }

  return {
    list,
    activeCards,
    inactiveCards,
    loading,
    load,
    add,
    remove,
    restore,
  };
};
