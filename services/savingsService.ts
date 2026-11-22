import { supabase } from "@/config/supabase";
import {
  ResponseType,
  SavingsContributionType,
  SavingsGoalType,
} from "@/types";

type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number | string;
  currency: "JPY";
  deadline?: string | null;
  color: string;
  created_at?: string | null;
};
type ContributionRow = {
  id: string;
  goal_id: string;
  amount: number | string;
  note?: string | null;
  contribution_date: string;
  created_at?: string | null;
};

const number = (value: unknown) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};
const dateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDate = (value?: string | null) => {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const getUid = async () => {
  const { data, error } = await supabase.auth.getUser();
  return error ? null : (data.user?.id ?? null);
};

const calculateMonthlyRequired = (remaining: number, deadline?: Date) => {
  if (!deadline || remaining <= 0) return 0;
  const today = new Date();
  const months = Math.max(
    1,
    (deadline.getFullYear() - today.getFullYear()) * 12 +
      deadline.getMonth() -
      today.getMonth() +
      1,
  );
  return Math.ceil(remaining / months);
};

export const getSavingsGoals = async (): Promise<ResponseType> => {
  try {
    const uid = await getUid();
    if (!uid) return { success: false, msg: "Please sign in again" };
    const { data: goals, error: goalError } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (goalError) return { success: false, msg: goalError.message };
    const ids = (goals ?? []).map((goal) => goal.id);
    let contributions: ContributionRow[] = [];
    if (ids.length) {
      const { data, error } = await supabase
        .from("savings_contributions")
        .select("*")
        .in("goal_id", ids)
        .order("contribution_date", { ascending: false });
      if (error) return { success: false, msg: error.message };
      contributions = (data ?? []) as ContributionRow[];
    }
    const mapped = ((goals ?? []) as GoalRow[]).map((goal): SavingsGoalType => {
      const savedAmount = contributions
        .filter((item) => item.goal_id === goal.id)
        .reduce((sum, item) => sum + number(item.amount), 0);
      const targetAmount = number(goal.target_amount);
      const remaining = Math.max(0, targetAmount - savedAmount);
      const deadline = parseDate(goal.deadline);
      return {
        id: goal.id,
        uid: goal.user_id,
        name: goal.name,
        targetAmount,
        currency: goal.currency,
        deadline,
        color: goal.color,
        savedAmount,
        remaining,
        progress: targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0,
        monthlyRequired: calculateMonthlyRequired(remaining, deadline),
        created: goal.created_at ? new Date(goal.created_at) : undefined,
      };
    });
    return { success: true, data: mapped };
  } catch (error: any) {
    return { success: false, msg: error?.message || "Something went wrong" };
  }
};

export const getGoalContributions = async (
  goalId: string,
): Promise<ResponseType> => {
  const uid = await getUid();
  if (!uid) return { success: false, msg: "Please sign in again" };
  const { data, error } = await supabase
    .from("savings_contributions")
    .select("*")
    .eq("goal_id", goalId)
    .eq("user_id", uid)
    .order("contribution_date", { ascending: false });
  if (error) return { success: false, msg: error.message };
  return {
    success: true,
    data: ((data ?? []) as ContributionRow[]).map(
      (item): SavingsContributionType => ({
        id: item.id,
        goalId: item.goal_id,
        amount: number(item.amount),
        note: item.note ?? undefined,
        contributionDate: parseDate(item.contribution_date)!,
        created: item.created_at ? new Date(item.created_at) : undefined,
      }),
    ),
  };
};

export const saveSavingsGoal = async (
  goal: Partial<SavingsGoalType>,
): Promise<ResponseType> => {
  const uid = await getUid();
  if (!uid) return { success: false, msg: "Please sign in again" };
  if (!goal.name?.trim() || number(goal.targetAmount) <= 0)
    return { success: false, msg: "Name and a valid target are required" };
  const payload = {
    name: goal.name.trim(),
    target_amount: number(goal.targetAmount),
    currency: "JPY",
    deadline: goal.deadline ? dateString(goal.deadline) : null,
    color: goal.color ?? "#a3e635",
  };
  const query = goal.id
    ? supabase
        .from("savings_goals")
        .update(payload)
        .eq("id", goal.id)
        .eq("user_id", uid)
        .select("*")
        .single()
    : supabase.from("savings_goals").insert(payload).select("*").single();
  const { data, error } = await query;
  return error
    ? { success: false, msg: error.message }
    : { success: true, data };
};

export const deleteSavingsGoal = async (id: string): Promise<ResponseType> => {
  const uid = await getUid();
  if (!uid) return { success: false, msg: "Please sign in again" };
  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", uid);
  return error ? { success: false, msg: error.message } : { success: true };
};

export const addSavingsContribution = async (
  goalId: string,
  amount: number,
  note: string,
  contributionDate: Date,
): Promise<ResponseType> => {
  if (!Number.isFinite(amount) || amount === 0)
    return { success: false, msg: "Amount cannot be zero" };
  const { data, error } = await supabase.rpc("add_savings_contribution", {
    p_goal_id: goalId,
    p_amount: amount,
    p_note: note.trim() || null,
    p_date: dateString(contributionDate),
  });
  return error
    ? { success: false, msg: error.message }
    : { success: true, data };
};

export const updateSavingsContribution = async (
  contributionId: string,
  amount: number,
  note: string,
  contributionDate: Date,
): Promise<ResponseType> => {
  if (!Number.isFinite(amount) || amount === 0) {
    return { success: false, msg: "Amount cannot be zero" };
  }

  const { data, error } = await supabase.rpc("update_savings_contribution", {
    p_contribution_id: contributionId,
    p_amount: amount,
    p_note: note.trim() || null,
    p_date: dateString(contributionDate),
  });

  return error
    ? { success: false, msg: error.message }
    : { success: true, data };
};

export const deleteSavingsContribution = async (
  contributionId: string,
): Promise<ResponseType> => {
  const { data, error } = await supabase.rpc("delete_savings_contribution", {
    p_contribution_id: contributionId,
  });

  return error
    ? { success: false, msg: error.message }
    : { success: true, data };
};
