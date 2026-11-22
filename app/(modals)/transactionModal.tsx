import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Header from "@/components/Header";
import ModalWrapper from "@/components/ModalWrapper";
import TransactionDateInput from "@/components/TransactionDateInput";
import Typo from "@/components/Typo";
import WalletColorPicker from "@/components/WalletColorPicker";
import WalletIconPicker from "@/components/WalletIconPicker";

import { transactionTypes } from "@/constants/data";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { AuthContext } from "@/contexts/authContext";

import {
  createOrUpdateTransaction,
  deleteTransaction,
} from "@/services/transactionService";

import { getUserWallets } from "@/services/walletService";
import { TransactionType } from "@/types";
import { scale, verticalScale } from "@/utils/styling";

import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";

import React, { useCallback, useContext, useMemo, useState } from "react";

import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Dropdown } from "react-native-element-dropdown";

// ==============================
// TYPES
// ==============================

type Wallet = {
  id: string;
  name: string;
  amount: number;
  totalIncome: number;
  totalExpenses: number;
};

type CategoryOption = {
  label: string;
  value: TransactionType["category"];
};

// ==============================
// CATEGORIES
// ==============================

const incomeCategories: CategoryOption[] = [
  { label: "Salary", value: "salary" },
  { label: "Bonus", value: "bonus" },
  { label: "Investment", value: "investment" },
  { label: "Gift", value: "gift" },
  { label: "Other", value: "other" },
];

const expenseCategories: CategoryOption[] = [
  { label: "Food", value: "food" },
  { label: "Shopping", value: "shopping" },
  { label: "Transport", value: "transport" },
  { label: "Bills", value: "bills" },
  { label: "Housing", value: "housing" },
  { label: "Health", value: "health" },
  { label: "Education", value: "education" },
  { label: "Entertainment", value: "entertainment" },
  { label: "Other", value: "other" },
];

// ==============================
// HELPERS
// ==============================

const showMessage = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

const parseTransactionDate = (value: unknown): Date => {
  if (typeof value !== "string" || !value) {
    return new Date();
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

// ==============================
// TRANSACTION MODAL
// ==============================

const TransactionModal = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const user = useContext(AuthContext)?.user;

  const [showCustomize, setShowCustomize] = useState(false);

  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [loading, setLoading] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [walletLoading, setWalletLoading] = useState(false);

  const transactionId = typeof params.id === "string" ? params.id : undefined;

  const isEditing = Boolean(transactionId);

  const paramType: TransactionType["type"] =
    params.type === "income" ? "income" : "expense";

  // ==============================
  // TRANSACTION STATE
  // ==============================

  const [transactionData, setTransactionData] = useState<
    Partial<TransactionType>
  >({
    id: transactionId,

    uid: user?.uid,

    walletId: typeof params.walletId === "string" ? params.walletId : undefined,

    name: typeof params.name === "string" ? params.name : "",

    description:
      typeof params.description === "string" ? params.description : "",

    type: paramType,

    category:
      typeof params.category === "string"
        ? (params.category as TransactionType["category"])
        : undefined,

    amount: params.amount !== undefined ? Number(params.amount) : 0,

    iconName:
      typeof params.iconName === "string"
        ? (params.iconName as TransactionType["iconName"])
        : "wallet",

    iconColor:
      typeof params.iconColor === "string" ? params.iconColor : "#FFFFFF",

    backgroundColor:
      typeof params.backgroundColor === "string"
        ? params.backgroundColor
        : "#6C63FF",

    transactionDate: parseTransactionDate(params.transactionDate),
  });

  // ==============================
  // FETCH WALLETS
  // ==============================

  const fetchWallets = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setWalletLoading(true);

      const res = await getUserWallets(user.uid);

      if (!res.success) {
        console.error("[Wallet] Fetch failed:", res.msg);

        showMessage("Wallet", res.msg || "Failed to load wallets");

        return;
      }

      setWallets((res.data ?? []) as Wallet[]);
    } catch (error: any) {
      console.error("[Wallet] Fetch exception:", error);

      showMessage("Wallet", error?.message || "Failed to load wallets");
    } finally {
      setWalletLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      void fetchWallets();
    }, [fetchWallets]),
  );

  // ==============================
  // DROPDOWN DATA
  // ==============================

  const categoryData = useMemo(
    () =>
      transactionData.type === "income" ? incomeCategories : expenseCategories,
    [transactionData.type],
  );

  const walletDropdownData = useMemo(
    () =>
      wallets.map((wallet) => ({
        label: `${wallet.name} (¥${Number(
          wallet.amount ?? 0,
        ).toLocaleString()})`,

        value: wallet.id,
      })),
    [wallets],
  );

  const transactionTypeData = useMemo(
    () =>
      transactionTypes.map((item: any) => ({
        label: item.label,
        value: item.value,
      })),
    [],
  );

  // ==============================
  // SAVE / UPDATE
  // ==============================

  const onSubmit = async () => {
    console.log("[Transaction] Save button pressed:", Platform.OS);

    if (loading || deleting) return;

    const name = transactionData.name?.trim();

    const description = transactionData.description?.trim() || "";

    const amount = Number(transactionData.amount ?? 0);

    // VALIDATION

    if (!user?.uid) {
      showMessage("Transaction", "User not found");
      return;
    }

    if (!transactionData.walletId) {
      showMessage("Transaction", "Please select a wallet");
      return;
    }

    if (!name) {
      showMessage("Transaction", "Please enter transaction name");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage("Transaction", "Please enter a valid amount");
      return;
    }

    if (
      transactionData.type !== "income" &&
      transactionData.type !== "expense"
    ) {
      showMessage("Transaction", "Please select transaction type");
      return;
    }

    if (!transactionData.category) {
      showMessage("Transaction", "Please select a category");
      return;
    }

    // SAVE TO SUPABASE

    try {
      setLoading(true);

      const data: Partial<TransactionType> = {
        ...transactionData,

        uid: user.uid,

        walletId: transactionData.walletId,

        name,
        description,

        type: transactionData.type,
        category: transactionData.category,

        amount,

        transactionDate: transactionData.transactionDate ?? new Date(),

        iconName: transactionData.iconName ?? "wallet",

        iconColor: transactionData.iconColor ?? "#FFFFFF",

        backgroundColor: transactionData.backgroundColor ?? "#6C63FF",
      };

      console.log("[Transaction] Calling createOrUpdateTransaction");

      const res = await createOrUpdateTransaction(data);

      if (!res.success) {
        console.error("[Transaction] Save failed:", res.msg);

        showMessage("Transaction", res.msg || "Failed to save transaction");

        return;
      }

      console.log("[Transaction] Save successful");

      router.back();
    } catch (error: any) {
      console.error("[Transaction] Save exception:", error);

      showMessage("Transaction", error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // DELETE TRANSACTION
  // ==============================

  const onDelete = () => {
    console.log("[Transaction] Delete button pressed");

    if (loading || deleting) return;

    if (!transactionId || !user?.uid) {
      showMessage("Transaction", "Transaction or user not found");
      return;
    }

    const id = transactionId;
    const uid = user.uid;

    const performDelete = async () => {
      try {
        setDeleting(true);

        console.log("[Transaction] Calling deleteTransaction");

        const res = await deleteTransaction(id, uid);

        if (!res.success) {
          console.error("[Transaction] Delete failed:", res.msg);

          showMessage("Transaction", res.msg || "Failed to delete transaction");

          return;
        }

        console.log("[Transaction] Delete successful");

        router.back();
      } catch (error: any) {
        console.error("[Transaction] Delete exception:", error);

        showMessage(
          "Transaction",
          error?.message || "Failed to delete transaction",
        );
      } finally {
        setDeleting(false);
      }
    };

    const message =
      "Are you sure you want to delete " +
      "this transaction? " +
      "This action cannot be undone.";

    // WEB CONFIRMATION

    if (Platform.OS === "web") {
      const confirmed = window.confirm(message);

      if (confirmed) {
        void performDelete();
      }

      return;
    }

    // EXPO GO CONFIRMATION

    Alert.alert("Delete Transaction", message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void performDelete();
        },
      },
    ]);
  };

  // ==============================
  // UI
  // ==============================

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title={isEditing ? "Edit Transaction" : "New Transaction"}
          leftIcon={<BackButton />}
          style={{
            marginBottom: spacingY._10,
          }}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.form}
        >
          {/* TRANSACTION TYPE */}

          <FormField label="Transaction Type">
            <Dropdown
              {...getDropdownProps()}
              data={transactionTypeData}
              maxHeight={200}
              placeholder="Select type"
              value={transactionData.type}
              onChange={(item) =>
                setTransactionData((prev) => ({
                  ...prev,

                  type: item.value as TransactionType["type"],

                  category:
                    prev.type === item.value ? prev.category : undefined,
                }))
              }
            />
          </FormField>

          {/* CATEGORY */}

          <FormField label="Category">
            <Dropdown
              {...getDropdownProps()}
              data={categoryData}
              maxHeight={300}
              placeholder="Select category"
              value={transactionData.category}
              onChange={(item: CategoryOption) =>
                setTransactionData((prev) => ({
                  ...prev,
                  category: item.value,
                }))
              }
            />
          </FormField>

          {/* TRANSACTION NAME */}

          <FormField label="Transaction Name">
            <TextInput
              style={styles.input}
              placeholder="e.g. Lunch, Salary..."
              placeholderTextColor={colors.neutral500}
              value={transactionData.name ?? ""}
              onChangeText={(name) =>
                setTransactionData((prev) => ({
                  ...prev,
                  name,
                }))
              }
            />
          </FormField>

          {/* AMOUNT */}

          <FormField label="Amount">
            <TextInput
              style={styles.input}
              placeholder="¥0"
              placeholderTextColor={colors.neutral500}
              keyboardType="number-pad"
              value={
                transactionData.amount ? String(transactionData.amount) : ""
              }
              onChangeText={(text) => {
                const amount = Number(text.replace(/\D/g, "")) || 0;

                setTransactionData((prev) => ({
                  ...prev,
                  amount,
                }));
              }}
            />
          </FormField>

          {/* WALLET */}

          <FormField label="Wallet">
            <Dropdown
              {...getDropdownProps()}
              data={walletDropdownData}
              maxHeight={300}
              placeholder={
                walletLoading
                  ? "Loading wallets..."
                  : wallets.length === 0
                    ? "No wallets"
                    : "Select wallet"
              }
              value={transactionData.walletId}
              disable={walletLoading || wallets.length === 0}
              onChange={(item) =>
                setTransactionData((prev) => ({
                  ...prev,
                  walletId: item.value,
                }))
              }
            />
          </FormField>

          {/* TRANSACTION DATE */}

          <FormField label="Transaction Date">
            <TransactionDateInput
              value={transactionData.transactionDate ?? new Date()}
              maximumDate={new Date()}
              onChange={(selectedDate) =>
                setTransactionData((prev) => ({
                  ...prev,
                  transactionDate: selectedDate,
                }))
              }
            />
          </FormField>

          {/* DESCRIPTION */}

          <FormField label="Description" optional>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Add a note about this transaction"
              placeholderTextColor={colors.neutral500}
              multiline
              textAlignVertical="top"
              value={transactionData.description ?? ""}
              onChangeText={(description) =>
                setTransactionData((prev) => ({
                  ...prev,
                  description,
                }))
              }
            />
          </FormField>

          {/* CUSTOMIZE */}

          <View style={styles.customizeSection}>
            <Pressable
              style={styles.customizeHeader}
              onPress={() => setShowCustomize((current) => !current)}
            >
              <View style={styles.customizeTitle}>
                <Typo color={colors.neutral200}>Customize</Typo>

                <Typo size={13} color={colors.neutral500}>
                  Icon and color
                </Typo>
              </View>

              <Typo size={20} color={colors.neutral300}>
                {showCustomize ? "−" : "+"}
              </Typo>
            </Pressable>

            {showCustomize && (
              <View style={styles.customizeContent}>
                <FormField label="Transaction Icon">
                  <WalletIconPicker
                    selectedIcon={transactionData.iconName ?? "wallet"}
                    backgroundColor={
                      transactionData.backgroundColor ?? "#6C63FF"
                    }
                    onSelect={(iconName) =>
                      setTransactionData((prev) => ({
                        ...prev,
                        iconName,
                      }))
                    }
                  />
                </FormField>

                <FormField label="Transaction Color">
                  <WalletColorPicker
                    selectedColor={transactionData.backgroundColor ?? "#6C63FF"}
                    onSelect={(backgroundColor) =>
                      setTransactionData((prev) => ({
                        ...prev,
                        backgroundColor,
                      }))
                    }
                  />
                </FormField>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* FOOTER */}

      <View style={styles.footer}>
        {isEditing && (
          <TouchableOpacity
            onPress={onDelete}
            disabled={loading || deleting}
            activeOpacity={0.8}
            style={[
              styles.deleteButton,
              (loading || deleting) && styles.disabledButton,
            ]}
          >
            <Typo color={colors.rose} fontWeight="700">
              {deleting ? "Deleting..." : "Delete"}
            </Typo>
          </TouchableOpacity>
        )}

        <Button onPress={onSubmit} loading={loading} style={{ flex: 1 }}>
          <Typo color={colors.black} fontWeight="700">
            {isEditing ? "Update Transaction" : "Add Transaction"}
          </Typo>
        </Button>
      </View>
    </ModalWrapper>
  );
};

// ==============================
// FORM FIELD
// ==============================

const FormField = ({
  label,
  optional = false,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) => (
  <View style={styles.inputContainer}>
    <View style={styles.fieldLabelRow}>
      <Typo color={colors.neutral200}>{label}</Typo>

      {optional && (
        <Typo color={colors.neutral500} size={14}>
          (optional)
        </Typo>
      )}
    </View>

    {children}
  </View>
);

// ==============================
// DROPDOWN PROPS
// ==============================

const getDropdownProps = () => ({
  style: styles.dropdownContainer,

  activeColor: colors.neutral700,

  selectedTextStyle: styles.dropdownSelectedText,

  placeholderStyle: styles.dropdownPlaceholder,

  iconStyle: styles.dropdownIcon,

  labelField: "label" as const,
  valueField: "value" as const,

  itemTextStyle: styles.dropdownItemText,

  itemContainerStyle: styles.dropdownItemContainer,

  containerStyle: styles.dropdownListContainer,
});

export default TransactionModal;

// ==============================
// STYLES
// ==============================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
  },

  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacingX._20,
    gap: scale(12),
    paddingTop: spacingY._15,
    borderTopColor: colors.neutral700,
    marginBottom: spacingY._5,
    borderTopWidth: 1,
  },

  deleteButton: {
    minHeight: verticalScale(50),
    minWidth: verticalScale(96),
    paddingHorizontal: spacingX._15,
    borderWidth: 1,
    borderColor: colors.rose,
    borderRadius: radius._15,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  form: {
    gap: spacingY._20,
    marginTop: spacingY._15,
    paddingBottom: spacingY._30,
  },

  inputContainer: {
    gap: spacingY._10,
  },

  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  input: {
    height: verticalScale(54),
    paddingHorizontal: spacingX._15,
    borderColor: colors.neutral300,
    borderWidth: 1,
    borderRadius: radius._15,
    borderCurve: "continuous",
    color: colors.white,
    fontSize: verticalScale(14),
  },

  descriptionInput: {
    height: verticalScale(100),
    paddingTop: spacingY._15,
  },

  dropdownContainer: {
    height: verticalScale(54),
    paddingHorizontal: spacingX._15,
    borderColor: colors.neutral300,
    borderWidth: 1,
    borderRadius: radius._15,
    borderCurve: "continuous",
  },

  dropdownItemText: {
    color: colors.white,
  },

  dropdownSelectedText: {
    color: colors.white,
    fontSize: verticalScale(14),
  },

  dropdownPlaceholder: {
    color: colors.neutral500,
    fontSize: verticalScale(14),
  },

  dropdownListContainer: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._15,
    borderCurve: "continuous",
    paddingVertical: spacingY._7,
    top: 5,
    borderColor: colors.neutral500,

    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },

  dropdownItemContainer: {
    borderRadius: radius._15,
    marginHorizontal: spacingX._7,
  },

  dropdownIcon: {
    height: verticalScale(30),
    tintColor: colors.neutral300,
  },

  customizeSection: {
    borderColor: colors.neutral700,
    borderWidth: 1,
    borderRadius: radius._15,
    padding: spacingX._15,
    gap: spacingY._15,
  },

  customizeHeader: {
    minHeight: verticalScale(32),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  customizeTitle: {
    gap: spacingY._5,
  },

  customizeContent: {
    gap: spacingY._20,
  },
});
