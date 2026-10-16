import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { getWalletIcon } from "@/constants/walletIcons";
import { AuthContext } from "@/contexts/authContext";
import { getUserTransactions } from "@/services/transactionService";
import { getUserWallets } from "@/services/walletService";
import { TransactionType, WalletType } from "@/types";
import { getFinanceSummary } from "@/utils/finance";
import { verticalScale } from "@/utils/styling";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";

const formatMoney = (value: number) => `¥${value.toLocaleString()}`;

type StatisticsPeriod = "day" | "week" | "month";

const periodOptions: { label: string; value: StatisticsPeriod }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const getTransactionDate = (transaction: TransactionType) => {
  const rawDate = transaction.transactionDate ?? transaction.created;

  if (!rawDate) return null;
  if (rawDate instanceof Date) return rawDate;

  // Supports Firestore Timestamp values at runtime without changing the type.
  if (typeof (rawDate as any)?.toDate === "function") {
    return (rawDate as any).toDate() as Date;
  }

  const parsedDate = new Date(rawDate as any);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getPeriodStart = (period: StatisticsPeriod, now: Date) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  }

  if (period === "month") {
    start.setDate(1);
  }

  return start;
};

const getPeriodEnd = (period: StatisticsPeriod, start: Date) => {
  const end = new Date(start);

  if (period === "day") end.setDate(end.getDate() + 1);
  if (period === "week") end.setDate(end.getDate() + 7);
  if (period === "month") end.setMonth(end.getMonth() + 1);

  return end;
};

const getPeriodLabel = (period: StatisticsPeriod, now: Date) => {
  const start = getPeriodStart(period, now);
  const end = getPeriodEnd(period, start);
  const lastDay = new Date(end);
  lastDay.setDate(lastDay.getDate() - 1);

  if (period === "day") {
    return start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (period === "week") {
    const startLabel = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endLabel = lastDay.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${startLabel} – ${endLabel}`;
  }

  return start.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const getChartBuckets = (
  period: StatisticsPeriod,
  transactions: TransactionType[],
) => {
  const labels =
    period === "day"
      ? ["0h", "4h", "8h", "12h", "16h", "20h"]
      : period === "week"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : ["W1", "W2", "W3", "W4", "W5"];

  const buckets = labels.map((label) => ({ label, income: 0, expense: 0 }));

  transactions.forEach((transaction) => {
    const date = getTransactionDate(transaction);
    if (!date) return;

    const index =
      period === "day"
        ? Math.floor(date.getHours() / 4)
        : period === "week"
          ? (date.getDay() + 6) % 7
          : Math.min(4, Math.floor((date.getDate() - 1) / 7));
    const amount = Math.abs(Number(transaction.amount) || 0);

    if (transaction.type === "income") buckets[index].income += amount;
    if (transaction.type === "expense") buckets[index].expense += amount;
  });

  return buckets;
};

const toDateParam = (date: Date | null) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatShortDate = (date: Date | null) =>
  date
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "No date";

const Statistics = () => {
  const user = useContext(AuthContext)?.user;
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<StatisticsPeriod>("month");
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [transactionLimit, setTransactionLimit] = useState(5);

  const loadData = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [walletResult, transactionResult] = await Promise.all([
        getUserWallets(user.uid),
        getUserTransactions(user.uid),
      ]);

      if (!walletResult.success || !transactionResult.success) {
        setError(
          transactionResult.msg ||
            walletResult.msg ||
            "Unable to load statistics.",
        );
        return;
      }

      setWallets((walletResult.data ?? []) as WalletType[]);
      setTransactions((transactionResult.data ?? []) as TransactionType[]);
    } catch {
      setError("Unable to load statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const finance = useMemo(
    () => getFinanceSummary(wallets, transactions),
    [wallets, transactions],
  );

  const filteredTransactions = useMemo(() => {
    const start = getPeriodStart(period, referenceDate);
    const end = getPeriodEnd(period, start);

    return transactions.filter((transaction) => {
      const date = getTransactionDate(transaction);
      return date !== null && date >= start && date < end;
    });
  }, [period, referenceDate, transactions]);

  const periodSummary = useMemo(
    () =>
      filteredTransactions.reduce(
        (summary, transaction) => {
          const amount = Math.abs(Number(transaction.amount) || 0);

          if (transaction.type === "income") summary.income += amount;
          if (transaction.type === "expense") summary.expense += amount;

          return summary;
        },
        { income: 0, expense: 0 },
      ),
    [filteredTransactions],
  );

  const periodLabel = useMemo(
    () => getPeriodLabel(period, referenceDate),
    [period, referenceDate],
  );

  const isCurrentPeriod = useMemo(() => {
    const selectedStart = getPeriodStart(period, referenceDate).getTime();
    const currentStart = getPeriodStart(period, new Date()).getTime();
    return selectedStart >= currentStart;
  }, [period, referenceDate]);

  const changePeriod = (nextPeriod: StatisticsPeriod) => {
    setPeriod(nextPeriod);
    setReferenceDate(new Date());
    setTransactionLimit(5);
  };

  const movePeriod = (direction: -1 | 1) => {
    setTransactionLimit(5);
    setReferenceDate((current) => {
      const next = new Date(current);

      if (period === "day") next.setDate(next.getDate() + direction);
      if (period === "week") next.setDate(next.getDate() + direction * 7);
      if (period === "month") {
        next.setDate(1);
        next.setMonth(next.getMonth() + direction);
      }

      return next;
    });
  };

  const chartBuckets = useMemo(
    () => getChartBuckets(period, filteredTransactions),
    [filteredTransactions, period],
  );

  const visibleTransactions = useMemo(
    () =>
      [...filteredTransactions].sort((a, b) => {
        const aTime = getTransactionDate(a)?.getTime() ?? 0;
        const bTime = getTransactionDate(b)?.getTime() ?? 0;
        return bTime - aTime;
      }),
    [filteredTransactions],
  );

  const displayedTransactions = visibleTransactions.slice(0, transactionLimit);
  const hasMoreTransactions = transactionLimit < visibleTransactions.length;

  const editTransaction = (transaction: TransactionType) => {
    router.push({
      pathname: "/(modals)/transactionModal",
      params: {
        id: transaction.id ?? "",
        walletId: transaction.walletId ?? "",
        name: transaction.name,
        description: transaction.description ?? "",
        type: transaction.type,
        category: transaction.category ?? "",
        amount: String(transaction.amount),
        iconName: transaction.iconName,
        iconColor: transaction.iconColor,
        backgroundColor: transaction.backgroundColor,
        transactionDate: toDateParam(getTransactionDate(transaction)),
      },
    });
  };

  const totalCashFlow = periodSummary.income + periodSummary.expense;
  const incomePercent = totalCashFlow
    ? (periodSummary.income / totalCashFlow) * 100
    : 0;
  const expensePercent = totalCashFlow
    ? (periodSummary.expense / totalCashFlow) * 100
    : 0;
  const netFlow = periodSummary.income - periodSummary.expense;
  const maxWalletBalance = Math.max(
    ...finance.wallets.map((item) => item.balance),
    0,
  );
  const hasTransactions = filteredTransactions.length > 0;

  const barData = useMemo(
    () =>
      chartBuckets.flatMap((bucket) => [
        {
          value: bucket.income,
          frontColor: colors.green,
          spacing: verticalScale(3),
        },
        {
          value: bucket.expense,
          label: bucket.label,
          frontColor: colors.rose,
          spacing: verticalScale(period === "week" ? 10 : 16),
        },
      ]),
    [chartBuckets, period],
  );

  const pieData = useMemo(
    () => [
      { value: periodSummary.income, color: colors.green },
      { value: periodSummary.expense, color: colors.rose },
    ],
    [periodSummary.expense, periodSummary.income],
  );

  const chartWidth = Math.max(
    220,
    windowWidth - spacingX._20 * 2 - spacingX._15 * 2,
  );

  return (
    <ScreenWrapper style={{ backgroundColor: colors.black }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Typo size={26} fontWeight="700">
              Statistics
            </Typo>
            <Typo size={14} color={colors.neutral400}>
              Your financial overview
            </Typo>
          </View>
          <View style={styles.headerIcon}>
            <Icons.ChartPieSliceIcon
              size={verticalScale(23)}
              color={colors.primary}
              weight="fill"
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Typo size={14} color={colors.neutral400}>
              Loading statistics...
            </Typo>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Icons.WarningCircleIcon
              size={verticalScale(40)}
              color={colors.rose}
              weight="fill"
            />
            <Typo size={15} color={colors.neutral300}>
              {error}
            </Typo>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.periodSelector}>
              {periodOptions.map((option) => {
                const selected = period === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => changePeriod(option.value)}
                    style={[
                      styles.periodButton,
                      selected && styles.periodButtonSelected,
                    ]}
                  >
                    <Typo
                      size={14}
                      fontWeight={selected ? "600" : "400"}
                      color={selected ? colors.black : colors.neutral400}
                    >
                      {option.label}
                    </Typo>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.periodNavigation}>
              <Pressable
                onPress={() => movePeriod(-1)}
                style={styles.periodArrow}
              >
                <Icons.CaretLeftIcon
                  size={verticalScale(20)}
                  color={colors.neutral200}
                  weight="bold"
                />
              </Pressable>

              <View style={styles.periodNavigationLabel}>
                <Typo size={15} fontWeight="600">
                  {periodLabel}
                </Typo>
                {!isCurrentPeriod && (
                  <Pressable
                    onPress={() => {
                      setReferenceDate(new Date());
                      setTransactionLimit(5);
                    }}
                  >
                    <Typo size={12} color={colors.primary}>
                      Back to current
                    </Typo>
                  </Pressable>
                )}
              </View>

              <Pressable
                disabled={isCurrentPeriod}
                onPress={() => movePeriod(1)}
                style={[
                  styles.periodArrow,
                  isCurrentPeriod && styles.periodArrowDisabled,
                ]}
              >
                <Icons.CaretRightIcon
                  size={verticalScale(20)}
                  color={
                    isCurrentPeriod ? colors.neutral700 : colors.neutral200
                  }
                  weight="bold"
                />
              </Pressable>
            </View>

            <View style={styles.balanceCard}>
              <Typo size={15} color={colors.neutral400}>
                Total Balance
              </Typo>
              <Typo size={38} fontWeight="700">
                {formatMoney(finance.totalBalance)}
              </Typo>
              <View style={styles.trendRow}>
                {netFlow >= 0 ? (
                  <Icons.TrendUpIcon
                    size={verticalScale(18)}
                    color={colors.green}
                    weight="bold"
                  />
                ) : (
                  <Icons.TrendDownIcon
                    size={verticalScale(18)}
                    color={colors.rose}
                    weight="bold"
                  />
                )}
                <Typo size={14} color={colors.neutral300}>
                  Net cash flow: {netFlow >= 0 ? "+" : ""}
                  {formatMoney(netFlow)}
                </Typo>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatCard
                label="Income"
                value={periodSummary.income}
                color={colors.green}
                icon="income"
              />
              <StatCard
                label="Expense"
                value={periodSummary.expense}
                color={colors.rose}
                icon="expense"
              />
            </View>

            {!hasTransactions ? (
              <View style={[styles.section, styles.emptyState]}>
                <Icons.ChartBarIcon
                  size={verticalScale(42)}
                  color={colors.neutral500}
                  weight="duotone"
                />
                <Typo size={17} fontWeight="600">
                  No transaction data
                </Typo>
                <Typo size={14} color={colors.neutral400}>
                  No income or expense was recorded for this period.
                </Typo>
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <View style={styles.chartHeader}>
                    <View>
                      <Typo size={18} fontWeight="600">
                        Income & Expense
                      </Typo>
                      <Typo size={13} color={colors.neutral400}>
                        {periodLabel}
                      </Typo>
                    </View>
                    <View style={styles.chartLegend}>
                      <ChartLegend label="Income" color={colors.green} />
                      <ChartLegend label="Expense" color={colors.rose} />
                    </View>
                  </View>
                  <View style={styles.barChart}>
                    <BarChart
                      data={barData}
                      width={chartWidth - verticalScale(42)}
                      height={verticalScale(190)}
                      barWidth={verticalScale(period === "week" ? 9 : 12)}
                      initialSpacing={verticalScale(12)}
                      roundedTop
                      noOfSections={4}
                      yAxisThickness={0}
                      xAxisThickness={0}
                      yAxisTextStyle={styles.axisText}
                      xAxisLabelTextStyle={styles.axisText}
                      rulesColor={colors.neutral800}
                      rulesType="solid"
                      isAnimated
                      animationDuration={700}
                      formatYLabel={(label) => {
                        const value = Number(label);
                        if (value >= 1_000_000) return `${value / 1_000_000}m`;
                        if (value >= 1_000) return `${value / 1_000}k`;
                        return label;
                      }}
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <View>
                    <Typo size={18} fontWeight="600">
                      Cash Flow
                    </Typo>
                    <Typo size={13} color={colors.neutral400}>
                      {periodLabel}
                    </Typo>
                  </View>
                  <View style={styles.pieRow}>
                    <PieChart
                      data={pieData}
                      donut
                      radius={verticalScale(72)}
                      innerRadius={verticalScale(48)}
                      innerCircleColor={colors.neutral900}
                      centerLabelComponent={() => (
                        <View style={styles.pieCenter}>
                          <Typo size={12} color={colors.neutral400}>
                            Total
                          </Typo>
                          <Typo size={14} fontWeight="700">
                            {formatMoney(totalCashFlow)}
                          </Typo>
                        </View>
                      )}
                    />
                    <View style={styles.legendList}>
                      <LegendItem
                        label="Income"
                        percent={incomePercent}
                        color={colors.green}
                      />
                      <LegendItem
                        label="Expense"
                        percent={expensePercent}
                        color={colors.rose}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}

            {hasTransactions && (
              <View style={styles.section}>
                <View style={styles.transactionSectionHeader}>
                  <View>
                    <Typo size={18} fontWeight="600">
                      Transactions
                    </Typo>
                    <Typo size={13} color={colors.neutral400}>
                      Tap a transaction to edit
                    </Typo>
                  </View>
                  <View style={styles.transactionCount}>
                    <Typo size={12} fontWeight="600" color={colors.primary}>
                      {visibleTransactions.length}
                    </Typo>
                  </View>
                </View>

                <View>
                  {displayedTransactions.map((transaction, index) => (
                    <StatisticTransactionRow
                      key={transaction.id ?? `${transaction.name}-${index}`}
                      transaction={transaction}
                      showDivider={index < displayedTransactions.length - 1}
                      onPress={() => editTransaction(transaction)}
                    />
                  ))}
                </View>

                {visibleTransactions.length > 5 && (
                  <View style={styles.transactionActions}>
                    {transactionLimit > 5 && (
                      <Pressable
                        onPress={() => setTransactionLimit(5)}
                        style={styles.transactionActionButton}
                      >
                        <Typo size={13} color={colors.neutral300}>
                          Show less
                        </Typo>
                      </Pressable>
                    )}

                    {hasMoreTransactions && (
                      <Pressable
                        onPress={() =>
                          setTransactionLimit((current) => current + 5)
                        }
                        style={styles.transactionActionButton}
                      >
                        <Typo size={13} fontWeight="600" color={colors.primary}>
                          Show more (
                          {visibleTransactions.length - transactionLimit})
                        </Typo>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={styles.section}>
              <Typo size={18} fontWeight="600">
                Wallet Breakdown
              </Typo>
              {finance.wallets.length === 0 ? (
                <Typo size={14} color={colors.neutral400}>
                  No wallets yet
                </Typo>
              ) : (
                finance.wallets.map((item) => {
                  const Icon = getWalletIcon(item.wallet.iconName);
                  const width: `${number}%` =
                    maxWalletBalance > 0
                      ? `${Math.max(0, (item.balance / maxWalletBalance) * 100)}%`
                      : "0%";

                  return (
                    <View
                      key={item.wallet.id ?? item.wallet.name}
                      style={styles.walletRow}
                    >
                      <View
                        style={[
                          styles.walletIcon,
                          { backgroundColor: item.wallet.backgroundColor },
                        ]}
                      >
                        <Icon
                          size={verticalScale(20)}
                          color={item.wallet.iconColor}
                          weight="fill"
                        />
                      </View>
                      <View style={styles.walletInfo}>
                        <View style={styles.walletTextRow}>
                          <Typo size={15} fontWeight="500">
                            {item.wallet.name}
                          </Typo>
                          <Typo size={14} color={colors.neutral300}>
                            {formatMoney(item.balance)}
                          </Typo>
                        </View>
                        <View style={styles.walletTrack}>
                          <View
                            style={[
                              styles.walletBar,
                              {
                                width,
                                backgroundColor: item.wallet.backgroundColor,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenWrapper>
  );
};

const StatCard = ({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: "income" | "expense";
}) => {
  const Icon = icon === "income" ? Icons.ArrowDownIcon : Icons.ArrowUpIcon;

  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Icon size={verticalScale(18)} color={color} weight="bold" />
      </View>
      <Typo size={13} color={colors.neutral400}>
        {label}
      </Typo>
      <Typo size={19} fontWeight="700" color={color}>
        {formatMoney(value)}
      </Typo>
    </View>
  );
};

const LegendItem = ({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <View>
      <Typo size={13} color={colors.neutral400}>
        {label}
      </Typo>
      <Typo size={17} fontWeight="700" color={color}>
        {percent.toFixed(0)}%
      </Typo>
    </View>
  </View>
);

const ChartLegend = ({ label, color }: { label: string; color: string }) => (
  <View style={styles.chartLegendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Typo size={11} color={colors.neutral400}>
      {label}
    </Typo>
  </View>
);

const StatisticTransactionRow = ({
  transaction,
  showDivider,
  onPress,
}: {
  transaction: TransactionType;
  showDivider: boolean;
  onPress: () => void;
}) => {
  const Icon = getWalletIcon(transaction.iconName);
  const isIncome = transaction.type === "income";
  const category = transaction.category
    ? transaction.category.charAt(0).toUpperCase() +
      transaction.category.slice(1)
    : isIncome
      ? "Income"
      : "Expense";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.transactionRow, showDivider && styles.transactionDivider]}
    >
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: transaction.backgroundColor },
        ]}
      >
        <Icon
          size={verticalScale(20)}
          color={transaction.iconColor}
          weight="fill"
        />
      </View>

      <View style={styles.transactionInfo}>
        <Typo size={15} fontWeight="500">
          {transaction.name}
        </Typo>
        <Typo size={12} color={colors.neutral400}>
          {category} · {formatShortDate(getTransactionDate(transaction))}
        </Typo>
      </View>

      <View style={styles.transactionAmount}>
        <Typo
          size={14}
          fontWeight="600"
          color={isIncome ? colors.green : colors.rose}
        >
          {isIncome ? "+" : "−"}
          {formatMoney(Math.abs(transaction.amount))}
        </Typo>
        <Icons.CaretRightIcon
          size={verticalScale(15)}
          color={colors.neutral500}
          weight="bold"
        />
      </View>
    </TouchableOpacity>
  );
};

export default Statistics;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacingX._20 },
  header: {
    marginTop: verticalScale(8),
    marginBottom: spacingY._20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerIcon: {
    width: verticalScale(44),
    height: verticalScale(44),
    borderRadius: radius._15,
    backgroundColor: colors.neutral800,
    justifyContent: "center",
    alignItems: "center",
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacingY._10,
    paddingHorizontal: spacingX._20,
  },
  scrollContent: { gap: spacingY._17, paddingBottom: verticalScale(110) },
  periodSelector: {
    flexDirection: "row",
    padding: verticalScale(4),
    borderRadius: radius._15,
    backgroundColor: colors.neutral900,
  },
  periodButton: {
    flex: 1,
    minHeight: verticalScale(40),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius._12,
  },
  periodButtonSelected: { backgroundColor: colors.primary },
  periodNavigation: {
    minHeight: verticalScale(48),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  periodNavigationLabel: {
    flex: 1,
    alignItems: "center",
    gap: spacingY._5,
  },
  periodArrow: {
    width: verticalScale(42),
    height: verticalScale(42),
    borderRadius: radius._12,
    backgroundColor: colors.neutral900,
    alignItems: "center",
    justifyContent: "center",
  },
  periodArrowDisabled: { opacity: 0.45 },
  balanceCard: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._20,
    padding: spacingX._20,
    gap: spacingY._7,
  },
  trendRow: { flexDirection: "row", alignItems: "center", gap: spacingX._7 },
  statsRow: { flexDirection: "row", gap: spacingX._12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.neutral900,
    borderRadius: radius._17,
    padding: spacingX._15,
    gap: spacingY._7,
  },
  statIcon: {
    width: verticalScale(34),
    height: verticalScale(34),
    borderRadius: radius._10,
    backgroundColor: colors.neutral800,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._17,
    padding: spacingX._15,
    gap: spacingY._15,
    overflow: "hidden",
  },
  emptyState: {
    minHeight: verticalScale(190),
    alignItems: "center",
    justifyContent: "center",
  },
  barChart: { alignItems: "center", overflow: "hidden" },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacingX._10,
  },
  chartLegend: {
    alignItems: "flex-end",
    gap: spacingY._5,
  },
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._5,
  },
  transactionSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transactionCount: {
    minWidth: verticalScale(28),
    height: verticalScale(28),
    paddingHorizontal: spacingX._7,
    borderRadius: 99,
    backgroundColor: colors.neutral800,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionRow: {
    minHeight: verticalScale(64),
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    paddingVertical: spacingY._10,
  },
  transactionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral800,
  },
  transactionIcon: {
    width: verticalScale(40),
    height: verticalScale(40),
    borderRadius: radius._12,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionInfo: { flex: 1, gap: spacingY._5 },
  transactionAmount: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._5,
  },
  transactionActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacingX._10,
  },
  transactionActionButton: {
    minHeight: verticalScale(38),
    paddingHorizontal: spacingX._15,
    borderRadius: radius._12,
    backgroundColor: colors.neutral800,
    alignItems: "center",
    justifyContent: "center",
  },
  axisText: { color: colors.neutral400, fontSize: 11 },
  pieRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  pieCenter: { alignItems: "center" },
  legendList: { gap: spacingY._17 },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
  },
  legendDot: {
    width: verticalScale(10),
    height: verticalScale(10),
    borderRadius: 99,
  },
  walletRow: { flexDirection: "row", alignItems: "center", gap: spacingX._12 },
  walletIcon: {
    width: verticalScale(42),
    height: verticalScale(42),
    borderRadius: radius._12,
    justifyContent: "center",
    alignItems: "center",
  },
  walletInfo: { flex: 1, gap: spacingY._7 },
  walletTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletTrack: {
    height: verticalScale(8),
    backgroundColor: colors.neutral800,
    borderRadius: 100,
    overflow: "hidden",
  },
  walletBar: { height: "100%", borderRadius: 100 },
});
