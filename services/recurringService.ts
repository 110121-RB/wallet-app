import { supabase } from "@/config/supabase";
import { RecurringRuleType, ResponseType } from "@/types";

type RuleRow = {
  id: string;
  user_id: string;
  wallet_id: string;
  name: string;
  type: "income" | "expense";
  category: string;
  amount: number | string;
  frequency: "weekly" | "monthly";
  next_run_date: string;
  is_active: boolean;
  created_at?: string;
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

const mapRule = (row: RuleRow): RecurringRuleType => ({
  id: row.id,
  uid: row.user_id,
  walletId: row.wallet_id,
  name: row.name,
  type: row.type,
  category: row.category,
  amount: Number(row.amount),
  frequency: row.frequency,
  nextRunDate: parseDate(row.next_run_date),
  isActive: row.is_active,
  created: row.created_at ? new Date(row.created_at) : undefined,
});

const getUid = async () => {
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user?.id ? null : data.user.id;
};

export const processMyRecurringRules = async (): Promise<ResponseType> => {
  const { data, error } = await supabase.rpc("process_my_recurring_transactions");
  return error
    ? { success: false, msg: error.message }
    : { success: true, data: data ?? 0 };
};

export const getRecurringRules = async (): Promise<ResponseType> => {
  try {
    const uid = await getUid();
    if (!uid) return { success: false, msg: "Please sign in again" };
    const { data, error } = await supabase
      .from("recurring_rules")
      .select("*")
      .eq("user_id", uid)
      .order("next_run_date", { ascending: true });
    return error
      ? { success: false, msg: error.message }
      : { success: true, data: ((data ?? []) as RuleRow[]).map(mapRule) };
  } catch (error: any) {
    return { success: false, msg: error?.message || "Something went wrong" };
  }
};

export const saveRecurringRule = async (
  rule: Partial<RecurringRuleType>,
): Promise<ResponseType> => {
  try {
    const uid = await getUid();
    if (!uid) return { success: false, msg: "Please sign in again" };
    if (!rule.walletId || !rule.name?.trim() || !rule.category?.trim()) {
      return { success: false, msg: "Please complete all required fields" };
    }
    if (!rule.amount || rule.amount <= 0) {
      return { success: false, msg: "Amount must be greater than 0" };
    }
    const payload = {
      wallet_id: rule.walletId,
      name: rule.name.trim(),
      type: rule.type ?? "expense",
      category: rule.category.trim(),
      amount: rule.amount,
      frequency: rule.frequency ?? "monthly",
      next_run_date: formatDate(rule.nextRunDate ?? new Date()),
      is_active: rule.isActive ?? true,
    };
    const query = rule.id
      ? supabase.from("recurring_rules").update(payload).eq("id", rule.id).eq("user_id", uid).select("*").single()
      : supabase.from("recurring_rules").insert(payload).select("*").single();
    const { data, error } = await query;
    return error
      ? { success: false, msg: error.message }
      : { success: true, data: mapRule(data as RuleRow) };
  } catch (error: any) {
    return { success: false, msg: error?.message || "Something went wrong" };
  }
};

export const deleteRecurringRule = async (id: string): Promise<ResponseType> => {
  const uid = await getUid();
  if (!uid) return { success: false, msg: "Please sign in again" };
  const { error } = await supabase.from("recurring_rules").delete().eq("id", id).eq("user_id", uid);
  return error ? { success: false, msg: error.message } : { success: true };
};
