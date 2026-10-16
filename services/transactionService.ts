import { supabase } from "@/config/supabase";
import { walletIconMap, WalletIconName } from "@/constants/walletIcons";
import { ResponseType, TransactionType } from "@/types";

type TransactionRow = {
  id: string;
  user_id: string;
  wallet_id: string;
  name: string;
  type: "income" | "expense";
  category?: string | null;
  amount: number | string | null;
  description?: string | null;
  receipt_url?: string | null;
  icon_name: string | null;
  icon_color: string | null;
  background_color: string | null;
  transaction_date?: string | null;
  created_at?: string | null;
};

const toNumber = (value: unknown): number => {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const toWalletIconName = (iconName: unknown): WalletIconName => {
  if (typeof iconName === "string" && iconName in walletIconMap) {
    return iconName as WalletIconName;
  }

  return "wallet";
};

/*
 * Uses local calendar values, not UTC.
 * This prevents a selected date from shifting by one day.
 */
const formatTransactionDate = (date?: Date): string => {
  const selectedDate =
    date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const day = String(selectedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/*
 * Parse YYYY-MM-DD as a local date, rather than UTC.
 */
const parseTransactionDate = (date?: string | null): Date | undefined => {
  if (!date) return undefined;

  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
};

const mapTransaction = (transaction: TransactionRow): TransactionType => ({
  id: transaction.id,
  uid: transaction.user_id,
  walletId: transaction.wallet_id,
  name: transaction.name,
  type: transaction.type,
  category: transaction.category ?? undefined,
  amount: toNumber(transaction.amount),
  description: transaction.description ?? undefined,
  receiptUrl: transaction.receipt_url ?? undefined,
  iconName: toWalletIconName(transaction.icon_name),
  iconColor: transaction.icon_color ?? "#FFFFFF",
  backgroundColor: transaction.background_color ?? "#6C63FF",
  transactionDate: parseTransactionDate(transaction.transaction_date),
  created: transaction.created_at
    ? new Date(transaction.created_at)
    : undefined,
});

const validateTransaction = (
  transactionData: Partial<TransactionType>,
): string | null => {
  if (!transactionData.uid) return "User not found";
  if (!transactionData.walletId) return "Wallet is required";
  if (!transactionData.category?.trim()) return "Category is required";
  if (!transactionData.name?.trim()) return "Transaction name is required";

  if (transactionData.type !== "income" && transactionData.type !== "expense") {
    return "Transaction type is invalid";
  }

  if (toNumber(transactionData.amount) <= 0) {
    return "Amount must be greater than 0";
  }

  return null;
};

const buildTransactionPayload = (
  transactionData: Partial<TransactionType>,
) => ({
  wallet_id: transactionData.walletId,
  name: transactionData.name?.trim(),
  type: transactionData.type,
  category: transactionData.category?.trim(),
  amount: toNumber(transactionData.amount),
  description: transactionData.description?.trim() || null,
  receipt_url: transactionData.receiptUrl ?? null,
  icon_name: transactionData.iconName ?? "wallet",
  icon_color: transactionData.iconColor ?? "#FFFFFF",
  background_color: transactionData.backgroundColor ?? "#6C63FF",
  transaction_date: formatTransactionDate(transactionData.transactionDate),
});

export const getTransactionById = async (
  transactionId: string,
  uid: string,
): Promise<ResponseType> => {
  try {
    if (!transactionId || !uid) {
      return { success: false, msg: "Transaction not found" };
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("user_id", uid)
      .single();

    if (error) {
      return { success: false, msg: error.message };
    }

    return {
      success: true,
      data: mapTransaction(data as TransactionRow),
    };
  } catch (error: any) {
    console.log("Error fetching transaction:", error);

    return {
      success: false,
      msg: error?.message || "Something went wrong",
    };
  }
};

export const getUserTransactions = async (
  uid: string,
): Promise<ResponseType> => {
  try {
    if (!uid) {
      return { success: false, msg: "User not found" };
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", uid)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, msg: error.message };
    }

    return {
      success: true,
      data: ((data ?? []) as TransactionRow[]).map(mapTransaction),
    };
  } catch (error: any) {
    console.log("Error fetching transactions:", error);

    return {
      success: false,
      msg: error?.message || "Something went wrong",
    };
  }
};

export const getWalletTransactions = async (
  walletId: string,
  uid: string,
): Promise<ResponseType> => {
  try {
    if (!walletId || !uid) {
      return { success: false, msg: "Wallet not found" };
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("wallet_id", walletId)
      .eq("user_id", uid)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, msg: error.message };
    }

    return {
      success: true,
      data: ((data ?? []) as TransactionRow[]).map(mapTransaction),
    };
  } catch (error: any) {
    console.log("Error fetching wallet transactions:", error);

    return {
      success: false,
      msg: error?.message || "Something went wrong",
    };
  }
};

export const createOrUpdateTransaction = async (
  transactionData: Partial<TransactionType>,
): Promise<ResponseType> => {
  try {
    const validationError = validateTransaction(transactionData);

    if (validationError) {
      return { success: false, msg: validationError };
    }

    const transactionPayload = buildTransactionPayload(transactionData);

    const query = transactionData.id
      ? supabase
          .from("transactions")
          .update(transactionPayload)
          .eq("id", transactionData.id)
          .eq("user_id", transactionData.uid)
          .select("*")
          .single()
      : supabase
          .from("transactions")
          .insert({
            ...transactionPayload,
            user_id: transactionData.uid,
          })
          .select("*")
          .single();

    const { data, error } = await query;

    if (error) {
      console.log("Transaction database error:", error);
      return { success: false, msg: error.message };
    }

    return {
      success: true,
      data: mapTransaction(data as TransactionRow),
      msg: transactionData.id
        ? "Transaction updated successfully"
        : "Transaction created successfully",
    };
  } catch (error: any) {
    console.log("Error creating/updating transaction:", error);

    return {
      success: false,
      msg: error?.message || "Something went wrong",
    };
  }
};

export const deleteTransaction = async (
  transactionId: string,
  uid: string,
): Promise<ResponseType> => {
  try {
    if (!transactionId || !uid) {
      return { success: false, msg: "Transaction not found" };
    }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId)
      .eq("user_id", uid);

    if (error) {
      return { success: false, msg: error.message };
    }

    return {
      success: true,
      msg: "Transaction deleted successfully",
    };
  } catch (error: any) {
    console.log("Error deleting transaction:", error);

    return {
      success: false,
      msg: error?.message || "Something went wrong",
    };
  }
};
