import {
  subMonths,
  subWeeks,
  subYears,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
} from "date-fns";

export const useSelectedTimePeriod = (period) => {
  const currentPeriod = computed(() => {
    switch (period.value) {
      case "Monthly":
        return {
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date()),
        }
      case "Weekly":
        return {
            from: startOfWeek(new Date()),
            to: endOfWeek(new Date()),
        }
      case "Yearly":
        return {
            from: startOfYear(new Date()),
            to: endOfYear(new Date()),
        }
    }
  });

  const previousPeriod = computed(() => {
    switch (period.value) {
      case "Monthly":
        return {
            from: startOfMonth(subMonths(new Date(), 1)),
            to: endOfMonth(subMonths(new Date(), 1)),
        }
      case "Weekly":
        return {
            from: startOfWeek(subWeeks(new Date(), 1)),
            to: endOfWeek(subWeeks(new Date(), 1)),
        }
      case "Yearly":
        return {
            from: startOfYear(subYears(new Date(), 1)),
            to: endOfYear(subYears(new Date(), 1)),
        }
    }
  });

  return {
    currentPeriod,
    previousPeriod,
  };
};
