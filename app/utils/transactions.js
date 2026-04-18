/**
 * @param {Array<{ created_at: string }>} transactions
 */
export function groupTransactionsByDate(transactions) {
  const grouped = {};
  for (const transaction of transactions ?? []) {
    const date = transaction.created_at.split("T")[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(transaction);
  }
  return grouped;
}

/**
 * @param {Array<{ type: string, amount: number }>} transactions
 */
export function summarizeTransactions(transactions) {
  const list = transactions ?? [];
  const income = list.filter((t) => t.type === "Income");
  const expense = list.filter((t) => t.type === "Expense");
  const investment = list.filter((t) => t.type === "Investment");
  const saving = list.filter((t) => t.type === "Saving");
  return {
    incomeCount: income.length,
    expenseCount: expense.length,
    investmentCount: investment.length,
    savingCount: saving.length,
    incomeTotal: income.reduce((acc, t) => acc + t.amount, 0),
    expenseTotal: expense.reduce((acc, t) => acc + t.amount, 0),
    investmentTotal: investment.reduce((acc, t) => acc + t.amount, 0),
    savingTotal: saving.reduce((acc, t) => acc + t.amount, 0),
  };
}

/**
 * @param {Array<{ user_id?: string }>} transactions
 * @param {string | null} userId
 */
export function filterTransactionsByUserId(transactions, userId) {
  if (!userId) return transactions ?? [];
  return (transactions ?? []).filter((t) => t.user_id === userId);
}
