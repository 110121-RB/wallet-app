import BudgetCard from "@/components/BudgetCard";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { useBudgets } from "@/hooks/useBudgets";
import { BudgetWithProgress } from "@/types";
import { verticalScale } from "@/utils/styling";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const Budget = () => {
  const router = useRouter();
  const { budgets, loading, error, refresh } = useBudgets();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const summary = useMemo(
    () =>
      budgets.reduce(
        (total, budget) => ({
          limit: total.limit + budget.amount,
          spent: total.spent + budget.spent,
        }),
        { limit: 0, spent: 0 },
      ),
    [budgets],
  );

  const openBudget = (budget?: BudgetWithProgress) => {
    if (!budget) {
      router.push("/(modals)/budgetModal" as any);
      return;
    }
    router.push({
      pathname: "/(modals)/budgetModal",
      params: {
        id: budget.id,
        category: budget.category,
        amount: String(budget.amount),
        period: budget.period,
        startDate: budget.startDate.toISOString().slice(0, 10),
      },
    } as any);
  };

  return (
    <ScreenWrapper style={{ backgroundColor: colors.black }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Typo size={26} fontWeight="700">Budgets</Typo>
            <Typo size={14} color={colors.neutral400}>Keep spending on track</Typo>
          </View>
          <Pressable onPress={() => openBudget()} style={styles.addButton}>
            <Icons.PlusIcon size={23} color={colors.black} weight="bold" />
          </Pressable>
        </View>

        <View style={styles.summary}>
          <View>
            <Typo size={13} color={colors.neutral400}>Current budget</Typo>
            <Typo size={28} fontWeight="700">¥{summary.limit.toLocaleString()}</Typo>
          </View>
          <View style={styles.summaryRight}>
            <Typo size={13} color={colors.neutral400}>Spent</Typo>
            <Typo size={18} color={summary.spent > summary.limit ? colors.rose : colors.neutral100} fontWeight="600">
              ¥{summary.spent.toLocaleString()}
            </Typo>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Typo size={14} color={colors.neutral400}>Loading budgets...</Typo>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Icons.WarningCircleIcon size={34} color={colors.rose} />
            <Typo size={14} color={colors.neutral300} style={styles.centerText}>{error}</Typo>
            <Pressable onPress={() => void refresh()}><Typo size={14} color={colors.primary}>Try again</Typo></Pressable>
          </View>
        ) : (
          <FlatList
            data={budgets}
            keyExtractor={(item) => item.id ?? `${item.category}-${item.period}`}
            renderItem={({ item }) => <BudgetCard budget={item} onPress={() => openBudget(item)} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Icons.ChartDonutIcon size={42} color={colors.neutral500} />
                <Typo size={16} fontWeight="600">No budgets yet</Typo>
                <Typo size={13} color={colors.neutral400} style={styles.centerText}>
                  Add a category budget to start tracking your spending.
                </Typo>
              </View>
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
};

export default Budget;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacingX._20 },
  header: {
    paddingTop: spacingY._15,
    paddingBottom: spacingY._20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addButton: {
    width: verticalScale(43), height: verticalScale(43), borderRadius: 22,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  summary: {
    backgroundColor: colors.neutral900, borderRadius: 20, padding: spacingX._20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: spacingY._15,
  },
  summaryRight: { alignItems: "flex-end", gap: 3 },
  list: { gap: spacingY._12, paddingBottom: spacingY._30, flexGrow: 1 },
  centerState: { flex: 1, minHeight: verticalScale(260), alignItems: "center", justifyContent: "center", gap: spacingY._10 },
  centerText: { textAlign: "center", maxWidth: 280 },
});
