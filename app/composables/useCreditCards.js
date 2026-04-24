import { parseISO } from "date-fns";

const STORAGE_KEY = "finance-tracker-credit-cards-v2";
const LEGACY_KEY = "finance-tracker-credit-cards-v1";

function dayPart(n) {
  const d = Math.floor(Number(n));
  if (!Number.isFinite(d) || d < 1) return 1;
  if (d > 31) return 31;
  return d;
}

/**
 * v2: cycleStartDay / cycleEndDay / paymentDueDay are 1–31. v1 used ISO date strings.
 */
function normalizeFromLegacy(entry) {
  if (!entry) return null;
  if (typeof entry.cycleStartDay === "number" && entry.cycleStartDay >= 1) {
    return {
      ...entry,
      cycleStartDay: dayPart(entry.cycleStartDay),
      cycleEndDay: dayPart(entry.cycleEndDay),
      paymentDueDay: dayPart(entry.paymentDueDay),
    };
  }
  const p = (s) => {
    try {
      return parseISO(s);
    } catch {
      return null;
    }
  };
  const a = p(entry.cycleStart);
  const b = p(entry.cycleEnd);
  const d = p(entry.paymentDue);
  if (!a && !b && !d) {
    return {
      ...entry,
      cycleStartDay: 1,
      cycleEndDay: 1,
      paymentDueDay: 1,
    };
  }
  return {
    ...entry,
    cycleStartDay: a ? a.getDate() : 1,
    cycleEndDay: b ? b.getDate() : 1,
    paymentDueDay: d ? d.getDate() : 1,
  };
}

/**
 * Client-side list: card name + billing as day-of-month 1–31 (no month/year here).
 * Persists in localStorage until a backend exists.
 */
export const useCreditCards = () => {
  const list = useState("credit-cards-store", () => []);

  const readStorage = () => {
    if (!import.meta.client) return [];
    try {
      if (localStorage.getItem(STORAGE_KEY)) {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(data)) return [];
        return data.map((c) => normalizeFromLegacy(c)).filter(Boolean);
      }
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const data = JSON.parse(legacy);
        if (Array.isArray(data) && data.length) {
          const mapped = data.map((c) => normalizeFromLegacy(c)).filter(Boolean);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          localStorage.removeItem(LEGACY_KEY);
          return mapped;
        }
      }
    } catch {
      /* empty */
    }
    return [];
  };

  const writeStorage = (items) => {
    if (!import.meta.client) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota */
    }
  };

  const sync = () => {
    list.value = readStorage();
  };

  onMounted(() => {
    sync();
  });

  const add = (row) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `card-${Date.now()}`;
    const entry = {
      id,
      name: String(row.name ?? "").trim(),
      cycleStartDay: dayPart(row.cycleStartDay),
      cycleEndDay: dayPart(row.cycleEndDay),
      paymentDueDay: dayPart(row.paymentDueDay),
      createdAt: new Date().toISOString(),
    };
    const next = [...(list.value ?? []), entry];
    list.value = next;
    writeStorage(next);
    return entry;
  };

  const remove = (id) => {
    const next = (list.value ?? []).filter((c) => c.id !== id);
    list.value = next;
    writeStorage(next);
  };

  return { list, add, remove, sync };
};
