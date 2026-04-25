export const transactionViewOptions = [
    'Yearly',
    'Monthly',
    'Weekly',
]

export const categories = [
    'Food',
    'Transportation',
    'Housing',
    'Utilities',
    'Entertainment',
    'Credit card',
    'Other',
]

export const types = [
    'Income',
    'Expense',
    'Investment',
    'Saving',
]

/**
 * Credit card form: spend → DB `type: expense`, subtype null; reserve → `subtype: reserve`;
 * payment to owner → `subtype: payment`
 */
export const creditCardLineOptions = [
  { value: "spend", label: "Card spend" },
  { value: "reserve", label: "Reserve" },
  { value: "payment", label: "Payment to owner" },
];

/** New shared expense group: purpose of the group (expense_groups.type) */
export const expenseGroupCategoryOptions = [
  { value: 'credit_card', label: 'Credit card' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'other', label: 'Other' },
]