export const useFetchTransactions = async () => {
  const supabase = useSupabaseClient();

  const income = computed(() => {
    return transactions.value.filter(
      (transaction) => transaction.type === "income",
    );
  });

  const expense = computed(() => {
    return transactions.value.filter(
      (transaction) => transaction.type === "expense",
    );
  });

  const incomeCount = computed(() => income.value.length);
  const expenseCount = computed(() => expense.value.length);

  const incomeTotal = computed(() =>
    income.value.reduce((acc, transaction) => acc + transaction.amount, 0),
  );
  const expenseTotal = computed(() =>
    expense.value.reduce((acc, transaction) => acc + transaction.amount, 0),
  );

  const {
    data: transactions,
    pending,
    refresh: refreshTransactions,
  } = await useAsyncData("transactions", async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select()
      .order("created_at", { ascending: false });
    if (error) return [];
    return data;
  });

  const transactionGroupedByDate = computed(() => {
    let grouped = {};
    transactions.value?.forEach((transaction) => {
      const date = new Date(transaction.created_at).toISOString().split("T")[0];
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
      incomeCount,
      expenseCount,
      incomeTotal,
      expenseTotal,
    },
    pending,
    refreshTransactions,
  };
};
