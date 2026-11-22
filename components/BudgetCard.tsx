import Typo from "@/components/Typo";
import { getExpenseCategoryLabel } from "@/constants/transactionCategories";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { BudgetWithProgress } from "@/types";
import { verticalScale } from "@/utils/styling";
import * as Icons from "phosphor-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

type Props = {
  budget: BudgetWithProgress;
  onPress: () => void;
};

const formatMoney = (value: number) => `¥${value.toLocaleString()}`;

const BudgetCard = ({ budget, onPress }: Props) => {
  const statusColor =
    budget.progress >= 100
      ? colors.rose
      : budget.progress >= 80
        ? "#f59e0b"
        : colors.primary;
  const status =
    budget.progress >= 100
      ? "Limit reached"
      : budget.progress >= 80
        ? "Almost at limit"
        : "On track";

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.categoryIcon}>
          <Icons.WalletIcon size={22} color={statusColor} weight="fill" />
        </View>
        <View style={styles.titleGroup}>
          <Typo size={16} fontWeight="600">
            {getExpenseCategoryLabel(budget.category)}
          </Typo>
          <Typo size={12} color={colors.neutral400}>
            {budget.period === "weekly" ? "Weekly" : "Monthly"} budget
          </Typo>
        </View>
        <Typo size={12} color={statusColor} fontWeight="600">
          {status}
        </Typo>
      </View>

      <View style={styles.amountRow}>
        <Typo size={21} fontWeight="700">
          {formatMoney(budget.spent)}
        </Typo>
        <Typo size={13} color={colors.neutral400}>
          of {formatMoney(budget.amount)}
        </Typo>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.progress,
            {
              backgroundColor: statusColor,
              width: `${Math.min(100, Math.max(0, budget.progress))}%`,
            },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Typo size={12} color={colors.neutral400}>
          {budget.progress.toFixed(0)}% used
        </Typo>
        <Typo size={12} color={colors.neutral300}>
          {formatMoney(budget.remaining)} remaining
        </Typo>
      </View>
    </Pressable>
  );
};

export default BudgetCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral800,
    borderRadius: radius._17,
    padding: spacingX._15,
    gap: spacingY._12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacingX._10 },
  categoryIcon: {
    width: verticalScale(42),
    height: verticalScale(42),
    borderRadius: radius._12,
    backgroundColor: colors.neutral700,
    alignItems: "center",
    justifyContent: "center",
  },
  titleGroup: { flex: 1, gap: 2 },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: spacingX._7 },
  track: {
    height: verticalScale(9),
    borderRadius: radius._10,
    overflow: "hidden",
    backgroundColor: colors.neutral700,
  },
  progress: { height: "100%", borderRadius: radius._10 },
  footer: { flexDirection: "row", justifyContent: "space-between" },
});
