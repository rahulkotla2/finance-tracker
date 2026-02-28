export const useFetchTransactions = async (period) => {
  const supabase = useSupabaseClient();

  const income = computed(() => {
    return transactions.value.filter(
      (transaction) => transaction.type === "Income",
    );
  });

  const expense = computed(() => {
    return transactions.value.filter(
      (transaction) => transaction.type === "Expense",
    );
  });

  const investment = computed(() => {
    return transactions.value.filter(
      (transaction) => transaction.type === "Investment",
    );
  });

  const saving = computed(() => {
    return transactions.value.filter(
      (transaction) => transaction.type === "Saving",
    );
  });

  const incomeCount = computed(() => income.value.length);
  const expenseCount = computed(() => expense.value.length);
  const investmentCount = computed(() => investment.value.length);
  const savingCount = computed(() => saving.value.length);

  const incomeTotal = computed(() =>
    income.value.reduce((acc, transaction) => acc + transaction.amount, 0),
  );
  const expenseTotal = computed(() =>
    expense.value.reduce((acc, transaction) => acc + transaction.amount, 0),
  );
  const investmentTotal = computed(() =>
    investment.value.reduce((acc, transaction) => acc + transaction.amount, 0),
  );
  const savingTotal = computed(() =>
    saving.value.reduce((acc, transaction) => acc + transaction.amount, 0),
  );

  const {
    data: transactions,
    pending,
    refresh: refreshTransactions,
  } = await useAsyncData(`${period.value.from.toDateString()}-${period.value.to.toDateString()}-transactions`, async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select()
      .gte("created_at", period.value.from.toISOString())
      .lte("created_at", period.value.to.toISOString())
      .order("created_at", { ascending: false });
      console.log(data)
    if (error) return [];
    return data;
  });

  const transactionGroupedByDate = computed(() => {
    let grouped = {};
    transactions.value?.forEach((transaction) => {
      const date =transaction.created_at.split("T")[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });
    return grouped;
  });

  return {
    transactions: {
      all: transactions,
      grouped: {
        byDate: transactionGroupedByDate,
      },
      income,
      expense,
      investment,
      saving,
      incomeCount,
      expenseCount,
      investmentCount,
      savingCount,
      incomeTotal,
      expenseTotal,
      investmentTotal,
      savingTotal,
    },
    pending,
    refreshTransactions,
  };
};
