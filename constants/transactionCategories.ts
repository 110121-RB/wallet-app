export const expenseCategoryOptions = [
  { label: "Food", value: "food" },
  { label: "Shopping", value: "shopping" },
  { label: "Transport", value: "transport" },
  { label: "Bills", value: "bills" },
  { label: "Housing", value: "housing" },
  { label: "Health", value: "health" },
  { label: "Education", value: "education" },
  { label: "Entertainment", value: "entertainment" },
  { label: "Other", value: "other" },
] as const;

export const getExpenseCategoryLabel = (category: string) =>
  expenseCategoryOptions.find((option) => option.value === category)?.label ??
  category.charAt(0).toUpperCase() + category.slice(1);
