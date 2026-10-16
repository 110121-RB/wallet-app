// export const CLOUDINARY_CLOUD_NAME = "du5c2n9ma";
// export const CLOUDINARY_UPLOAD_PRESET = "images";

import { WalletIconName } from "@/constants/walletIcons";
export type ResponseType = {
  success: boolean;
  msg?: string;
  data?: any;
};
export type WalletType = {
  id?: string;
  uid?: string;
  name: string;
  iconName: WalletIconName;
  iconColor: string;
  backgroundColor: string;
  amount: number;
  totalIncome: number;
  totalExpenses: number;
  created?: Date;
};

export type TransactionCategory =
  | "salary"
  | "bonus"
  | "investment"
  | "gift"
  | "food"
  | "shopping"
  | "transport"
  | "bills"
  | "housing"
  | "health"
  | "education"
  | "entertainment"
  | "other";
export type TransactionType = {
  id?: string;
  uid?: string;
  walletId?: string;
  name: string;
  description?: string;
  category?: TransactionCategory;
  type: "income" | "expense";
  amount: number;
  iconName: WalletIconName;
  iconColor: string;
  backgroundColor: string;
  transactionDate?: Date;
  created?: Date;
};
