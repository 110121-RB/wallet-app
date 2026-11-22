import { supabase } from "@/config/supabase";
import {
  BudgetPeriod,
  BudgetType,
  BudgetWithProgress,
  ResponseType,
} from "@/types";

type BudgetRow = {
  id: string;
  user_id: string;
  category: string;
  amount: number | string;
  period: BudgetPeriod;
  start_date: string;
  created_at?: string | null;
};

type ExpenseRow = {
  category: string | null;
  amount: number | string | null;
  transaction_date: string;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getAuthenticatedUserId = async (): Promise<
  { success: true; uid: string } | { success: false; msg: string }
> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return {
      success: false,
      msg: "Your session has expired. Please sign out and sign in again.",
    };
  }

  return { success: true, uid: user.id };
};

const mapBudget = (row: BudgetRow): BudgetType => ({
  id: row.id,
  uid: row.user_id,
  category: row.category,
  amount: toNumber(row.amount),
  period: row.period,
  startDate: parseDate(row.start_date),
  created: row.created_at ? new Date(row.created_at) : undefined,
});

export const getBudgetPeriodRange = (
  budget: Pick<BudgetType, "period" | "startDate">,
  referenceDate = new Date(),
) => {
  const start = new Date(budget.startDate);
  start.setHours(0, 0, 0, 0);
  const reference = new Date(referenceDate);
  reference.setHours(0, 0, 0, 0);

  if (reference < start) {
    const end = new Date(start);
    budget.period === "weekly"
      ? end.setDate(end.getDate() + 7)
      : end.setMonth(end.getMonth() + 1);
    return { start, end };
  }

  if (budget.period === "weekly") {
    const elapsedDays = Math.floor(
      (reference.getTime() - start.getTime()) / 86_400_000,
    );
    start.setDate(start.getDate() + Math.floor(elapsedDays / 7) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  const elapsedMonths =
    (reference.getFullYear() - start.getFullYear()) * 12 +
    reference.getMonth() -
    start.getMonth();
  start.setMonth(start.getMonth() + elapsedMonths);
  if (start > reference) start.setMonth(start.getMonth() - 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
};

export const getBudgetsWithProgress = async (
  uid: string,
  referenceDate = new Date(),
): Promise<ResponseType> => {
  try {
    if (!uid) return { success: false, msg: "User not found" };
    const authenticatedUser = await getAuthenticatedUserId();
    if (!authenticatedUser.success) return authenticatedUser;
    const authenticatedUid = authenticatedUser.uid;

    const { data: budgetRows, error: budgetError } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", authenticatedUid)
      .order("created_at", { ascending: false });

    if (budgetError) return { success: false, msg: budgetError.message };

    const budgets = ((budgetRows ?? []) as BudgetRow[]).map(mapBudget);
    if (!budgets.length) return { success: true, data: [] };

    const ranges = budgets.map((budget) =>
      getBudgetPeriodRange(budget, referenceDate),
    );
    const earliest = new Date(
      Math.min(...ranges.map((range) => range.start.getTime())),
    );
    const latest = new Date(
      Math.max(...ranges.map((range) => range.end.getTime())),
    );

    const { data: expenseRows, error: expenseError } = await supabase
      .from("transactions")
      .select("category, amount, transaction_date")
      .eq("user_id", authenticatedUid)
      .eq("type", "expense")
      .gte("transaction_date", formatDate(earliest))
      .lt("transaction_date", formatDate(latest));

    if (expenseError) return { success: false, msg: expenseError.message };

    const expenses = (expenseRows ?? []) as ExpenseRow[];
    const data: BudgetWithProgress[] = budgets.map((budget, index) => {
      const range = ranges[index];
      const startValue = formatDate(range.start);
      const endValue = formatDate(range.end);
      const spent = expenses.reduce((total, expense) => {
        if (
          expense.category !== budget.category ||
          expense.transaction_date < startValue ||
          expense.transaction_date >= endValue
        ) {
          return total;
        }
        return total + Math.abs(toNumber(expense.amount));
      }, 0);

      return {
        ...budget,
        spent,
        remaining: Math.max(0, budget.amount - spent),
        progress: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
        periodStart: range.start,
        periodEnd: range.end,
      };
    });

    return { success: true, data };
  } catch (error: any) {
    return { success: false, msg: error?.message || "Something went wrong" };
  }
};

export const createOrUpdateBudget = async (
  budget: Partial<BudgetType>,
): Promise<ResponseType> => {
  try {
    if (!budget.uid) return { success: false, msg: "User not found" };
    const authenticatedUser = await getAuthenticatedUserId();
    if (!authenticatedUser.success) return authenticatedUser;
    const authenticatedUid = authenticatedUser.uid;
    if (!budget.category?.trim()) {
      return { success: false, msg: "Category is required" };
    }
    if (budget.period !== "weekly" && budget.period !== "monthly") {
      return { success: false, msg: "Budget period is invalid" };
    }
    if (toNumber(budget.amount) <= 0) {
      return { success: false, msg: "Amount must be greater than 0" };
    }

    const payload = {
      category: budget.category.trim(),
      amount: toNumber(budget.amount),
      period: budget.period,
      start_date: formatDate(budget.startDate ?? new Date()),
    };
    const query = budget.id
      ? supabase
          .from("budgets")
          .update(payload)
          .eq("id", budget.id)
          .eq("user_id", authenticatedUid)
          .select("*")
          .single()
      : supabase
          .from("budgets")
          .insert({ ...payload, user_id: authenticatedUid })
          .select("*")
          .single();
    const { data, error } = await query;
    if (error) return { success: false, msg: error.message };
    return {
      success: true,
      data: mapBudget(data as BudgetRow),
      msg: budget.id
        ? "Budget updated successfully"
        : "Budget created successfully",
    };
  } catch (error: any) {
    return { success: false, msg: error?.message || "Something went wrong" };
  }
};

export const deleteBudget = async (
  budgetId: string,
  uid: string,
): Promise<ResponseType> => {
  try {
    if (!budgetId || !uid) return { success: false, msg: "Budget not found" };
    const authenticatedUser = await getAuthenticatedUserId();
    if (!authenticatedUser.success) return authenticatedUser;
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", budgetId)
      .eq("user_id", authenticatedUser.uid);
    return error
      ? { success: false, msg: error.message }
      : { success: true, msg: "Budget deleted successfully" };
  } catch (error: any) {
    return { success: false, msg: error?.message || "Something went wrong" };
  }
};
