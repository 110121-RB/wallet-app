import { TransactionType, WalletType } from "@/types";

export type WalletFinanceSummary = {
  wallet: WalletType;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
};

export type FinanceSummary = {
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  wallets: WalletFinanceSummary[];
};

const toNumber = (value: unknown): number => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

/*
 * wallet.amount is the opening balance of a wallet.
 * Current balance is always derived from its transactions.
 */
export const getFinanceSummary = (
  wallets: WalletType[],
  transactions: TransactionType[],
): FinanceSummary => {
  const walletSummaries = wallets.map((wallet) => {
    const walletTransactions = transactions.filter(
      (transaction) => transaction.walletId === wallet.id,
    );

    const totalIncome = walletTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + toNumber(transaction.amount), 0);

    const totalExpenses = walletTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + toNumber(transaction.amount), 0);

    return {
      wallet,
      totalIncome,
      totalExpenses,
      balance: toNumber(wallet.amount) + totalIncome - totalExpenses,
    };
  });

  return {
    totalIncome: walletSummaries.reduce(
      (total, wallet) => total + wallet.totalIncome,
      0,
    ),
    totalExpenses: walletSummaries.reduce(
      (total, wallet) => total + wallet.totalExpenses,
      0,
    ),
    totalBalance: walletSummaries.reduce(
      (total, wallet) => total + wallet.balance,
      0,
    ),
    wallets: walletSummaries,
  };
};
