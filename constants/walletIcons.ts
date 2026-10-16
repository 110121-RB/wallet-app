import type { IconProps } from "phosphor-react-native";
import {
    AirplaneTiltIcon,
    BankIcon,
    BriefcaseIcon,
    CarIcon,
    CreditCardIcon,
    GiftIcon,
    HouseIcon,
    MoneyIcon,
    PiggyBankIcon,
    ShoppingCartIcon,
    WalletIcon,
} from "phosphor-react-native";
import type { ComponentType } from "react";

export const walletIconMap = {
  wallet: WalletIcon,
  cash: MoneyIcon,
  card: CreditCardIcon,
  bank: BankIcon,
  salary: BriefcaseIcon,
  savings: PiggyBankIcon,
  home: HouseIcon,
  shopping: ShoppingCartIcon,
  travel: AirplaneTiltIcon,
  transport: CarIcon,
  gift: GiftIcon,
} satisfies Record<string, ComponentType<IconProps>>;

export type WalletIconName = keyof typeof walletIconMap;

export type WalletIconOption = {
  name: WalletIconName;
  label: string;
};

export const walletIcons: WalletIconOption[] = [
  { name: "wallet", label: "Wallet" },
  { name: "cash", label: "Cash" },
  { name: "card", label: "Card" },
  { name: "bank", label: "Bank" },
  { name: "salary", label: "Salary" },
  { name: "savings", label: "Savings" },
  { name: "home", label: "Home" },
  { name: "shopping", label: "Shopping" },
  { name: "travel", label: "Travel" },
  { name: "transport", label: "Transport" },
  { name: "gift", label: "Gift" },
];

export const getWalletIcon = (iconName?: string) => {
  if (iconName && iconName in walletIconMap) {
    return walletIconMap[iconName as WalletIconName];
  }

  return WalletIcon;
};
