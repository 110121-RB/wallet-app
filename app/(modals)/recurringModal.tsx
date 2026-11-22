import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Header from "@/components/Header";
import Input from "@/components/Input";
import ModalWrapper from "@/components/ModalWrapper";
import TransactionDateInput from "@/components/TransactionDateInput";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { expenseCategoryOptions } from "@/constants/transactionCategories";
import { saveRecurringRule } from "@/services/recurringService";
import { getUserWallets } from "@/services/walletService";
import { RecurringFrequency, WalletType } from "@/types";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";

const parseDate = (value: unknown) => {
  if (typeof value !== "string") return new Date();
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const incomeCategories = [
  { label: "Salary", value: "salary" },
  { label: "Bonus", value: "bonus" },
  { label: "Investment", value: "investment" },
  { label: "Other", value: "other" },
];

const RecurringModal = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletId, setWalletId] = useState(
    typeof params.walletId === "string" ? params.walletId : "",
  );
  const [name, setName] = useState(
    typeof params.name === "string" ? params.name : "",
  );
  const [type, setType] = useState<"income" | "expense">(
    params.type === "income" ? "income" : "expense",
  );
  const [category, setCategory] = useState(
    typeof params.category === "string" ? params.category : "food",
  );
  const [amount, setAmount] = useState(
    params.amount ? String(params.amount) : "",
  );
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    params.frequency === "weekly" ? "weekly" : "monthly",
  );
  const [nextRunDate, setNextRunDate] = useState(parseDate(params.nextRunDate));

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const { data: auth } = await (
          await import("@/config/supabase")
        ).supabase.auth.getUser();
        if (!auth.user) return;
        const result = await getUserWallets(auth.user.id);
        if (result.success) setWallets(result.data ?? []);
      })();
    }, []),
  );
  const submit = async () => {
    const value = Number(amount.replace(/,/g, ""));
    if (
      !walletId ||
      !name.trim() ||
      !category ||
      !Number.isFinite(value) ||
      value <= 0
    )
      return Alert.alert("Recurring", "Please complete all fields");
    setLoading(true);
    const result = await saveRecurringRule({
      id,
      walletId,
      name,
      type,
      category,
      amount: value,
      frequency,
      nextRunDate,
      isActive: params.isActive !== "false",
    });
    setLoading(false);
    if (!result.success)
      return Alert.alert("Recurring", result.msg || "Unable to save rule");
    router.back();
  };
  const dropdownStyle = styles.dropdown;
  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title={id ? "Edit Recurring" : "New Recurring"}
          leftIcon={<BackButton />}
        />
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.field}>
            <Typo size={14}>Name</Typo>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Rent, salary..."
            />
          </View>
          <View style={styles.field}>
            <Typo size={14}>Wallet</Typo>
            <Dropdown
              style={dropdownStyle}
              placeholderStyle={styles.placeholder}
              containerStyle={styles.menu}
              selectedTextStyle={styles.text}
              itemTextStyle={styles.text}
              activeColor={colors.neutral700}
              data={wallets.map((w) => ({ label: w.name, value: w.id }))}
              labelField="label"
              valueField="value"
              value={walletId}
              onChange={(item) => setWalletId(item.value)}
            />
          </View>
          <View style={styles.segment}>
            {(["expense", "income"] as const).map((v) => (
              <Pressable
                key={v}
                style={[styles.segmentItem, type === v && styles.active]}
                onPress={() => {
                  setType(v);
                  setCategory(v === "expense" ? "food" : "salary");
                }}
              >
                <Typo
                  size={14}
                  color={type === v ? colors.black : colors.white}
                  fontWeight="600"
                >
                  {v === "expense" ? "Expense" : "Income"}
                </Typo>
              </Pressable>
            ))}
          </View>
          <View style={styles.field}>
            <Typo size={14}>Category</Typo>
            <Dropdown
              style={dropdownStyle}
              containerStyle={styles.menu}
              selectedTextStyle={styles.text}
              itemTextStyle={styles.text}
              activeColor={colors.neutral700}
              data={
                type === "expense"
                  ? [...expenseCategoryOptions]
                  : incomeCategories
              }
              labelField="label"
              valueField="value"
              value={category}
              onChange={(item) => setCategory(item.value)}
            />
          </View>
          <View style={styles.field}>
            <Typo size={14}>Amount</Typo>
            <Input
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="30000"
            />
          </View>
          <View style={styles.field}>
            <Typo size={14}>Frequency</Typo>
            <View style={styles.segment}>
              {(["weekly", "monthly"] as RecurringFrequency[]).map((v) => (
                <Pressable
                  key={v}
                  style={[styles.segmentItem, frequency === v && styles.active]}
                  onPress={() => setFrequency(v)}
                >
                  <Typo
                    size={14}
                    color={frequency === v ? colors.black : colors.white}
                    fontWeight="600"
                  >
                    {v === "weekly" ? "Weekly" : "Monthly"}
                  </Typo>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Typo size={14}>First run date</Typo>
            <TransactionDateInput
              value={nextRunDate}
              onChange={setNextRunDate}
            />
          </View>
        </ScrollView>
      </View>
      <View style={styles.footer}>
        <Button
          style={{ flex: 1 }}
          loading={loading}
          onPress={() => void submit()}
        >
          <Typo color={colors.black} fontWeight="700">
            {id ? "Update Rule" : "Add Rule"}
          </Typo>
        </Button>
      </View>
    </ModalWrapper>
  );
};
export default RecurringModal;
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacingX._20 },
  form: {
    paddingTop: spacingY._25,
    paddingBottom: spacingY._30,
    gap: spacingY._20,
  },
  field: { gap: spacingY._10 },
  dropdown: {
    height: 54,
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    paddingHorizontal: spacingX._15,
  },
  placeholder: {
    color: colors.white,
    fontSize: 14,
  },
  menu: {
    backgroundColor: colors.neutral800,
    borderColor: colors.neutral600,
  },
  text: { color: colors.white },
  segment: { flexDirection: "row", gap: spacingX._10 },
  segmentItem: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: colors.neutral600,
    borderRadius: radius._15,
    alignItems: "center",
    justifyContent: "center",
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  footer: {
    flexDirection: "row",
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._15,
    borderTopWidth: 1,
    borderTopColor: colors.neutral700,
  },
});
