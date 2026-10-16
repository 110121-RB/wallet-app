import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Header from "@/components/Header";
import ModalWrapper from "@/components/ModalWrapper";
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
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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

const formatDisplayDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}年${month}月${day}日`;
};

const TransactionModal = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useContext(AuthContext)?.user;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  const transactionId = typeof params.id === "string" ? params.id : undefined;
  const isEditing = Boolean(transactionId);
  const paramType: TransactionType["type"] =
    params.type === "income" ? "income" : "expense";

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
    transactionDate:
      typeof params.transactionDate === "string"
        ? new Date(`${params.transactionDate}T00:00:00`)
        : new Date(),
  });

  const fetchWallets = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setWalletLoading(true);
      const res = await getUserWallets(user.uid);

      if (!res.success) {
        Alert.alert("Wallet", res.msg || "Failed to load wallets");
        return;
      }

      setWallets((res.data ?? []) as Wallet[]);
    } catch (error: any) {
      Alert.alert("Wallet", error?.message || "Failed to load wallets");
    } finally {
      setWalletLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchWallets();
    }, [fetchWallets]),
  );

  const categoryData = useMemo(
    () =>
      transactionData.type === "income" ? incomeCategories : expenseCategories,
    [transactionData.type],
  );

  const walletDropdownData = useMemo(
    () =>
      wallets.map((wallet) => ({
        label: `${wallet.name} (¥${wallet.amount.toLocaleString()})`,
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

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "dismissed" || !selectedDate) return;

    setTransactionData((prev) => ({
      ...prev,
      transactionDate: selectedDate,
    }));
  };

  const onSubmit = async () => {
    if (deleting) return;

    const name = transactionData.name?.trim();
    const description = transactionData.description?.trim() || "";
    const amount = Number(transactionData.amount ?? 0);

    if (!user?.uid) {
      Alert.alert("Transaction", "User not found");
      return;
    }
    if (!transactionData.walletId) {
      Alert.alert("Transaction", "Please select a wallet");
      return;
    }
    if (!name) {
      Alert.alert("Transaction", "Please enter transaction name");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Transaction", "Please enter a valid amount");
      return;
    }
    if (
      transactionData.type !== "income" &&
      transactionData.type !== "expense"
    ) {
      Alert.alert("Transaction", "Please select transaction type");
      return;
    }
    if (!transactionData.category) {
      Alert.alert("Transaction", "Please select a category");
      return;
    }

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

      const res = await createOrUpdateTransaction(data);

      if (!res.success) {
        Alert.alert("Transaction", res.msg || "Failed to save transaction");
        return;
      }

      router.back();
    } catch (error: any) {
      Alert.alert("Transaction", error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    if (!transactionId || !user?.uid || deleting) return;

    const id = transactionId;
    const uid = user.uid;

    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const res = await deleteTransaction(id, uid);

              if (!res.success) {
                Alert.alert(
                  "Transaction",
                  res.msg || "Failed to delete transaction",
                );
                return;
              }

              router.back();
            } catch (error: any) {
              Alert.alert(
                "Transaction",
                error?.message || "Failed to delete transaction",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title={isEditing ? "Edit Transaction" : "New Transaction"}
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._10 }}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.form}
        >
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

          <FormField label="Transaction Name">
            <TextInput
              style={styles.input}
              placeholder="e.g. Lunch, Salary..."
              placeholderTextColor={colors.neutral500}
              value={transactionData.name ?? ""}
              onChangeText={(name) =>
                setTransactionData((prev) => ({ ...prev, name }))
              }
            />
          </FormField>

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
                setTransactionData((prev) => ({ ...prev, amount }));
              }}
            />
          </FormField>

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

          <FormField label="Transaction Date">
            {!showDatePicker && (
              <Pressable
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Typo size={14} color={colors.white}>
                  {formatDisplayDate(
                    transactionData.transactionDate ?? new Date(),
                  )}
                </Typo>
              </Pressable>
            )}

            {showDatePicker && (
              <View>
                <DateTimePicker
                  themeVariant="dark"
                  textColor={colors.white}
                  value={transactionData.transactionDate ?? new Date()}
                  maximumDate={new Date()}
                  locale={Platform.OS === "ios" ? "ja-JP" : undefined}
                  timeZoneName="Asia/Tokyo"
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Typo size={15} fontWeight="500">
                      Done
                    </Typo>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </FormField>

          <FormField label="Description" optional>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Add a note about this transaction"
              placeholderTextColor={colors.neutral500}
              multiline
              textAlignVertical="top"
              value={transactionData.description ?? ""}
              onChangeText={(description) =>
                setTransactionData((prev) => ({ ...prev, description }))
              }
            />
          </FormField>

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
                      setTransactionData((prev) => ({ ...prev, iconName }))
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
  disabledButton: { opacity: 0.5 },
  form: {
    gap: spacingY._20,
    marginTop: spacingY._15,
    paddingBottom: spacingY._30,
  },
  inputContainer: { gap: spacingY._10 },
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
  dropdownItemText: { color: colors.white },
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
    shadowOffset: { width: 0, height: 5 },
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
  dateButton: {
    height: verticalScale(54),
    paddingHorizontal: spacingX._15,
    borderColor: colors.neutral300,
    borderWidth: 1,
    borderRadius: radius._15,
    borderCurve: "continuous",
    alignItems: "flex-start",
    justifyContent: "center",
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
  customizeTitle: { gap: spacingY._5 },
  customizeContent: { gap: spacingY._20 },
});
