import { supabase } from "@/config/supabase";
import { walletIconMap, WalletIconName } from "@/constants/walletIcons";
import { ResponseType, WalletType } from "@/types";

type WalletRow = {
  id: string;
  user_id?: string | null;
  uid?: string | null;
  name: string;
  icon_name: string | null;
  icon_color: string | null;
  background_color: string | null;
  amount: number | string | null;
  total_income: number | string | null;
  total_expenses: number | string | null;
  created_at?: string | null;
  created?: string | null;
};

const DEFAULT_WALLET: Pick<
  WalletType,
  "iconName" | "iconColor" | "backgroundColor" | "amount" | "totalIncome" | "totalExpenses"
> = {
  iconName: "wallet",
  iconColor: "#FFFFFF",
  backgroundColor: "#6C63FF",
  amount: 0,
  totalIncome: 0,
  totalExpenses: 0,
};

const toNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const toWalletIconName = (iconName: unknown): WalletIconName => {
  if (typeof iconName === "string" && iconName in walletIconMap) {
    return iconName as WalletIconName;
  }

  return DEFAULT_WALLET.iconName;
};

const mapWallet = (wallet: WalletRow): WalletType => ({
  id: wallet.id,
  uid: wallet.user_id ?? wallet.uid ?? undefined,
  name: wallet.name,
  iconName: toWalletIconName(wallet.icon_name),
  iconColor: wallet.icon_color || DEFAULT_WALLET.iconColor,
  backgroundColor: wallet.background_color || DEFAULT_WALLET.backgroundColor,
  amount: toNumber(wallet.amount),
  totalIncome: toNumber(wallet.total_income),
  totalExpenses: toNumber(wallet.total_expenses),
  created:
    wallet.created_at || wallet.created
      ? new Date(wallet.created_at ?? wallet.created ?? "")
      : undefined,
});

const buildWalletPayload = (walletData: Partial<WalletType>) => ({
  user_id: walletData.uid,
  uid: walletData.uid,
  name: walletData.name?.trim(),
  icon_name: walletData.iconName ?? DEFAULT_WALLET.iconName,
  icon_color: walletData.iconColor ?? DEFAULT_WALLET.iconColor,
  background_color: walletData.backgroundColor ?? DEFAULT_WALLET.backgroundColor,
  amount: toNumber(walletData.amount),
  total_income: toNumber(walletData.totalIncome),
  total_expenses: toNumber(walletData.totalExpenses),
});

export const createOrUpdateWallet = async (
  walletData: Partial<WalletType>,
): Promise<ResponseType> => {
  try {
    if (!walletData.uid) {
      return { success: false, msg: "User not found" };
    }

    if (!walletData.name?.trim()) {
      return { success: false, msg: "Wallet name is required" };
    }

    const walletToSave = buildWalletPayload(walletData);

    const query = walletData.id
      ? supabase
          .from("wallets")
          .update(walletToSave)
          .eq("id", walletData.id)
          .eq("user_id", walletData.uid)
          .select("*")
          .single()
      : supabase.from("wallets").insert(walletToSave).select("*").single();

    const { data, error } = await query;

    if (error) {
      console.log("Wallet database error:", error);
      return { success: false, msg: error.message };
    }

    return {
      success: true,
      data: mapWallet(data as WalletRow),
      msg: walletData.id
        ? "Wallet updated successfully"
        : "Wallet created successfully",
    };
  } catch (error: any) {
    console.log("Error creating/updating wallet:", error);
    return { success: false, msg: error?.message || "Something went wrong" };
  }
};

export const getUserWallets = async (uid: string): Promise<ResponseType> => {
  try {
    if (!uid) {
      return { success: false, msg: "User not found" };
    }

    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Error fetching wallets:", error);
      return { success: false, msg: error.message };
    }

    return {
      success: true,
      data: ((data ?? []) as WalletRow[]).map(mapWallet),
    };
  } catch (error: any) {
    console.log("Error fetching wallets:", error);
    return { success: false, msg: error?.message || "Something went wrong" };
  }
};

export const getWalletById = async (
  walletId: string,
  uid: string,
): Promise<ResponseType> => {
  try {
    if (!walletId || !uid) {
      return { success: false, msg: "Wallet not found" };
    }

    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("id", walletId)
      .eq("user_id", uid)
      .single();

    if (error) {
      return { success: false, msg: error.message };
    }

    return {
      success: true,
      data: mapWallet(data as WalletRow),
    };
  } catch (error: any) {
    console.log("Error fetching wallet:", error);
    return { success: false, msg: error?.message || "Something went wrong" };
  }
};

export const deleteWallet = async (
  walletId: string,
  uid: string,
): Promise<ResponseType> => {
  try {
    if (!walletId || !uid) {
      return { success: false, msg: "Wallet not found" };
    }

    const { error } = await supabase
      .from("wallets")
      .delete()
      .eq("id", walletId)
      .eq("user_id", uid);

    if (error) {
      return { success: false, msg: error.message };
    }

    return {
      success: true,
      msg: "Wallet deleted successfully",
    };
  } catch (error: any) {
    console.log("Error deleting wallet:", error);
    return { success: false, msg: error?.message || "Something went wrong" };
  }
};
