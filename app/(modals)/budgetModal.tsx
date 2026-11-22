import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Header from "@/components/Header";
import Input from "@/components/Input";
import ModalWrapper from "@/components/ModalWrapper";
import Typo from "@/components/Typo";
import { expenseCategoryOptions } from "@/constants/transactionCategories";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { AuthContext } from "@/contexts/authContext";
import { createOrUpdateBudget, deleteBudget } from "@/services/budgetService";
import { BudgetPeriod } from "@/types";
import { scale } from "@/utils/styling";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useContext, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";

const showMessage = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n${message}`);
    return;
  }
  Alert.alert(title, message);
};

const parseDate = (value: unknown) => {
  if (typeof value !== "string") return new Date();
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getCurrentPeriodStart = (period: BudgetPeriod) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (period === "weekly") {
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  } else {
    date.setDate(1);
  }
  return date;
};

const BudgetModal = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useContext(AuthContext)?.user;
  const id = typeof params.id === "string" ? params.id : undefined;
  const [category, setCategory] = useState(
    typeof params.category === "string" ? params.category : "food",
  );
  const [amount, setAmount] = useState(
    params.amount === undefined ? "" : String(params.amount),
  );
  const [period, setPeriod] = useState<BudgetPeriod>(
    params.period === "weekly" ? "weekly" : "monthly",
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const submit = async () => {
    const numericAmount = Number(amount.replace(/,/g, ""));
    if (!user?.uid) return showMessage("Budget", "User not found");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return showMessage("Budget", "Please enter a valid amount");
    }
    setLoading(true);
    const result = await createOrUpdateBudget({
      id,
      uid: user.uid,
      category,
      amount: numericAmount,
      period,
      startDate:
        typeof params.startDate === "string"
          ? parseDate(params.startDate)
          : getCurrentPeriodStart(period),
    });
    setLoading(false);
    if (!result.success) {
      showMessage("Budget", result.msg || "Unable to save budget");
      return;
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!id || !user?.uid) return;
    const remove = async () => {
      setDeleting(true);
      const result = await deleteBudget(id, user.uid!);
      setDeleting(false);
      if (!result.success) {
        showMessage("Budget", result.msg || "Unable to delete budget");
        return;
      }
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm("Delete this budget?")) void remove();
      return;
    }
    Alert.alert("Delete budget", "Delete this budget?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void remove() },
    ]);
  };

  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header title={id ? "Edit Budget" : "New Budget"} leftIcon={<BackButton />} />
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.field}>
            <Typo size={14} color={colors.neutral200}>Expense category</Typo>
            <Dropdown
              style={styles.dropdown}
              containerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownText}
              selectedTextStyle={styles.dropdownText}
              itemTextStyle={styles.itemText}
              activeColor={colors.neutral700}
              data={[...expenseCategoryOptions]}
              labelField="label"
              valueField="value"
              value={category}
              onChange={(item) => setCategory(item.value)}
              renderRightIcon={() => <Icons.CaretDownIcon size={18} color={colors.neutral300} />}
            />
          </View>

          <View style={styles.field}>
            <Typo size={14} color={colors.neutral200}>Spending limit</Typo>
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder="30000"
              keyboardType="numeric"
              icon={<Typo color={colors.neutral400}>¥</Typo>}
            />
          </View>

          <View style={styles.field}>
            <Typo size={14} color={colors.neutral200}>Period</Typo>
            <View style={styles.periodRow}>
              {(["weekly", "monthly"] as BudgetPeriod[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setPeriod(option)}
                  style={[styles.periodButton, period === option && styles.periodButtonActive]}
                >
                  <Typo size={14} color={period === option ? colors.black : colors.neutral300} fontWeight="600">
                    {option === "weekly" ? "Weekly" : "Monthly"}
                  </Typo>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.note}>
            <Icons.InfoIcon size={20} color={colors.primary} />
            <Typo size={13} color={colors.neutral300} style={{ flex: 1 }}>
              Spending is calculated automatically from expense transactions in this category.
            </Typo>
          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        {id && (
          <Pressable disabled={deleting || loading} onPress={confirmDelete} style={styles.deleteButton}>
            <Icons.TrashIcon size={22} color={colors.rose} />
          </Pressable>
        )}
        <Button onPress={() => void submit()} loading={loading} style={{ flex: 1 }}>
          <Typo color={colors.black} fontWeight="700">{id ? "Update Budget" : "Add Budget"}</Typo>
        </Button>
      </View>
    </ModalWrapper>
  );
};

export default BudgetModal;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacingX._20 },
  form: { paddingTop: spacingY._30, paddingBottom: spacingY._30, gap: spacingY._25 },
  field: { gap: spacingY._10 },
  dropdown: {
    height: 54, borderWidth: 1, borderColor: colors.neutral300,
    borderRadius: radius._17, paddingHorizontal: spacingX._15,
  },
  dropdownContainer: { backgroundColor: colors.neutral800, borderColor: colors.neutral600, borderRadius: radius._12 },
  dropdownText: { color: colors.white, fontSize: 15 },
  itemText: { color: colors.white },
  periodRow: { flexDirection: "row", gap: spacingX._10 },
  periodButton: {
    flex: 1, height: 48, borderRadius: radius._15, borderWidth: 1,
    borderColor: colors.neutral600, alignItems: "center", justifyContent: "center",
  },
  periodButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  note: { flexDirection: "row", gap: spacingX._10, backgroundColor: colors.neutral700, borderRadius: radius._15, padding: spacingX._15 },
  footer: {
    flexDirection: "row", gap: scale(12), paddingHorizontal: spacingX._20,
    paddingTop: spacingY._15, borderTopWidth: 1, borderTopColor: colors.neutral700,
  },
  deleteButton: {
    width: 52, height: 52, borderRadius: radius._17, backgroundColor: colors.neutral700,
    alignItems: "center", justifyContent: "center",
  },
});
