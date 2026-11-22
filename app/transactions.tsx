import BackButton from "@/components/BackButton";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { expenseCategories, incomeCategory } from "@/constants/data";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { getWalletIcon } from "@/constants/walletIcons";
import { AuthContext } from "@/contexts/authContext";
import {
  searchUserTransactions,
  TransactionSearchPeriod,
} from "@/services/transactionService";
import { getUserWallets } from "@/services/walletService";
import { TransactionType, WalletType } from "@/types";
import { verticalScale } from "@/utils/styling";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";

type TransactionFilterType = "all" | "income" | "expense";

const PAGE_SIZE = 20;

const typeOptions: { label: string; value: TransactionFilterType }[] = [
  { label: "All", value: "all" },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
];

const periodOptions: { label: string; value: TransactionSearchPeriod }[] = [
  { label: "All time", value: "all" },
  { label: "This month", value: "month" },
  { label: "Last 30 days", value: "30days" },
  { label: "This year", value: "year" },
];

const formatDateForRoute = (date?: Date) => {
  if (!date) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date?: Date) => {
  if (!date) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const Transactions = () => {
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const uid = authContext?.user?.uid;

  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [queryText, setQueryText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState<TransactionFilterType>("all");
  const [period, setPeriod] = useState<TransactionSearchPeriod>("all");
  const [category, setCategory] = useState("");
  const [walletId, setWalletId] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(queryText.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [queryText]);

  const categoryOptions = useMemo(() => {
    const options = Object.values(expenseCategories).map((item) => ({
      label: item.label,
      value: item.value,
    }));

    return [
      { label: "All categories", value: "" },
      { label: incomeCategory.label, value: incomeCategory.value },
      ...options,
    ];
  }, []);

  const walletOptions = useMemo(
    () => [
      { label: "All wallets", value: "" },
      ...wallets
        .filter((wallet) => Boolean(wallet.id))
        .map((wallet) => ({ label: wallet.name, value: wallet.id! })),
    ],
    [wallets],
  );

  const loadWallets = useCallback(async () => {
    if (!uid) return;

    const result = await getUserWallets(uid);

    if (result.success) {
      setWallets((result.data ?? []) as WalletType[]);
    }
  }, [uid]);

  const loadTransactions = useCallback(
    async (targetPage = 0, append = false) => {
      if (!uid) return;

      append ? setLoadingMore(true) : setLoading(true);
      setError("");

      const result = await searchUserTransactions(uid, {
        query: debouncedQuery,
        type,
        period,
        category: category || undefined,
        walletId: walletId || undefined,
        page: targetPage,
        pageSize: PAGE_SIZE,
      });

      if (result.success) {
        const items = (result.data?.items ?? []) as TransactionType[];
        setTransactions((current) => (append ? [...current, ...items] : items));
        setTotal(Number(result.data?.total ?? 0));
        setPage(targetPage);
      } else {
        setError(result.msg || "Unable to load transactions");
        if (!append) {
          setTransactions([]);
          setTotal(0);
        }
      }

      append ? setLoadingMore(false) : setLoading(false);
    },
    [category, debouncedQuery, period, type, uid, walletId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadWallets();
      void loadTransactions(0, false);
    }, [loadTransactions, loadWallets]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadWallets(), loadTransactions(0, false)]);
    setRefreshing(false);
  }, [loadTransactions, loadWallets]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || transactions.length >= total) return;
    void loadTransactions(page + 1, true);
  }, [loadTransactions, loading, loadingMore, page, total, transactions.length]);

  const resetFilters = () => {
    setQueryText("");
    setDebouncedQuery("");
    setType("all");
    setPeriod("all");
    setCategory("");
    setWalletId("");
  };

  const hasActiveFilters = Boolean(
    queryText || type !== "all" || period !== "all" || category || walletId,
  );

  const openTransaction = (transaction: TransactionType) => {
    if (!transaction.id) return;

    router.push({
      pathname: "/(modals)/transactionModal",
      params: {
        id: transaction.id,
        walletId: transaction.walletId,
        name: transaction.name,
        type: transaction.type,
        category: transaction.category,
        amount: String(transaction.amount),
        description: transaction.description ?? undefined,
        receiptUrl: transaction.receiptUrl ?? undefined,
        iconName: transaction.iconName,
        iconColor: transaction.iconColor,
        backgroundColor: transaction.backgroundColor,
        transactionDate: formatDateForRoute(transaction.transactionDate),
      },
    });
  };

  const renderTransaction = ({ item }: { item: TransactionType }) => {
    const Icon = getWalletIcon(item.iconName ?? "wallet");
    const isIncome = item.type === "income";

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => openTransaction(item)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.transactionIcon,
            { backgroundColor: item.backgroundColor ?? colors.neutral700 },
          ]}
        >
          <Icon
            size={verticalScale(24)}
            weight="fill"
            color={item.iconColor ?? colors.white}
          />
        </View>

        <View style={styles.transactionInfo}>
          <Typo size={16} fontWeight="500" textProps={{ numberOfLines: 1 }}>
            {item.name}
          </Typo>
          <Typo size={12} color={colors.neutral400}>
            {item.category || (isIncome ? "Income" : "Expense")}
          </Typo>
        </View>

        <View style={styles.amountDate}>
          <Typo
            size={15}
            fontWeight="600"
            color={isIncome ? colors.green : colors.rose}
          >
            {isIncome ? "+" : "-"}¥{item.amount.toLocaleString()}
          </Typo>
          <Typo size={11} color={colors.neutral400}>
            {formatDisplayDate(item.transactionDate)}
          </Typo>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View style={styles.filters}>
      <View style={styles.searchBox}>
        <Icons.MagnifyingGlassIcon size={20} color={colors.neutral400} />
        <TextInput
          value={queryText}
          onChangeText={setQueryText}
          placeholder="Search by transaction name"
          placeholderTextColor={colors.neutral500}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {queryText ? (
          <Pressable onPress={() => setQueryText("")} hitSlop={10}>
            <Icons.XCircleIcon size={20} color={colors.neutral400} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterTitleRow}>
        <Typo size={15} fontWeight="600">
          Type
        </Typo>
        {hasActiveFilters ? (
          <Pressable onPress={resetFilters}>
            <Typo size={13} color={colors.primary} fontWeight="600">
              Reset filters
            </Typo>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.chipRow}>
        {typeOptions.map((option) => {
          const selected = type === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setType(option.value)}
            >
              <Typo
                size={13}
                color={selected ? colors.black : colors.neutral300}
                fontWeight={selected ? "600" : "400"}
              >
                {option.label}
              </Typo>
            </Pressable>
          );
        })}
      </View>

      <Typo size={15} fontWeight="600">
        Period
      </Typo>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {periodOptions.map((option) => {
          const selected = period === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setPeriod(option.value)}
            >
              <Typo
                size={13}
                color={selected ? colors.black : colors.neutral300}
                fontWeight={selected ? "600" : "400"}
              >
                {option.label}
              </Typo>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.dropdownRow}>
        <View style={styles.dropdownField}>
          <Typo size={13} color={colors.neutral400}>
            Category
          </Typo>
          <Dropdown
            style={styles.dropdown}
            containerStyle={styles.dropdownMenu}
            selectedTextStyle={styles.dropdownText}
            itemTextStyle={styles.dropdownText}
            activeColor={colors.neutral700}
            data={categoryOptions}
            labelField="label"
            valueField="value"
            value={category}
            onChange={(item) => setCategory(item.value)}
          />
        </View>

        <View style={styles.dropdownField}>
          <Typo size={13} color={colors.neutral400}>
            Wallet
          </Typo>
          <Dropdown
            style={styles.dropdown}
            containerStyle={styles.dropdownMenu}
            selectedTextStyle={styles.dropdownText}
            itemTextStyle={styles.dropdownText}
            activeColor={colors.neutral700}
            data={walletOptions}
            labelField="label"
            valueField="value"
            value={walletId}
            onChange={(item) => setWalletId(item.value)}
          />
        </View>
      </View>

      <View style={styles.resultRow}>
        <Typo size={15} fontWeight="600">
          Results
        </Typo>
        <Typo size={13} color={colors.neutral400}>
          {total.toLocaleString()} transaction{total === 1 ? "" : "s"}
        </Typo>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Icons.WarningCircleIcon size={19} color={colors.rose} />
          <Typo size={13} color={colors.rose} style={{ flex: 1 }}>
            {error}
          </Typo>
          <Pressable onPress={() => void loadTransactions(0, false)}>
            <Typo size={13} color={colors.primary} fontWeight="600">
              Retry
            </Typo>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <ScreenWrapper style={{ backgroundColor: colors.black }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Typo size={24} fontWeight="700">
              Transactions
            </Typo>
            <Typo size={13} color={colors.neutral400}>
              Search and filter your history
            </Typo>
          </View>
        </View>

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id ?? `${item.name}-${item.amount}`}
          renderItem={renderTransaction}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icons.ReceiptIcon size={44} color={colors.neutral500} />
                <Typo size={15}>No matching transactions</Typo>
                <Typo
                  size={13}
                  color={colors.neutral400}
                  style={{ textAlign: "center" }}
                >
                  Try changing or resetting the filters.
                </Typo>
              </View>
            )
          }
          ListFooterComponent={
            transactions.length < total ? (
              <Pressable
                style={styles.loadMore}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Typo size={14} color={colors.primary} fontWeight="600">
                    Load more
                  </Typo>
                )}
              </Pressable>
            ) : null
          }
        />
      </View>
    </ScreenWrapper>
  );
};

export default Transactions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._12,
    paddingTop: spacingY._20,
    paddingBottom: spacingY._15,
  },
  list: {
    paddingBottom: spacingY._40,
  },
  filters: {
    gap: spacingY._12,
    paddingBottom: spacingY._17,
  },
  searchBox: {
    height: verticalScale(50),
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    paddingHorizontal: spacingX._15,
    backgroundColor: colors.neutral800,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.neutral700,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    color: colors.white,
    fontSize: verticalScale(14),
  },
  filterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipRow: {
    flexDirection: "row",
    gap: spacingX._7,
  },
  chip: {
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._7,
    borderRadius: radius._20,
    backgroundColor: colors.neutral800,
    borderWidth: 1,
    borderColor: colors.neutral700,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dropdownRow: {
    flexDirection: "row",
    gap: spacingX._10,
  },
  dropdownField: {
    flex: 1,
    gap: spacingY._5,
  },
  dropdown: {
    height: verticalScale(48),
    paddingHorizontal: spacingX._12,
    backgroundColor: colors.neutral800,
    borderRadius: radius._12,
    borderWidth: 1,
    borderColor: colors.neutral700,
  },
  dropdownMenu: {
    backgroundColor: colors.neutral800,
    borderColor: colors.neutral700,
    borderRadius: radius._12,
  },
  dropdownText: {
    color: colors.white,
    fontSize: verticalScale(13),
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacingY._5,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
    padding: spacingX._12,
    borderRadius: radius._12,
    backgroundColor: "#3f1518",
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._12,
    marginBottom: spacingY._12,
    padding: spacingX._10,
    backgroundColor: colors.neutral800,
    borderRadius: radius._17,
  },
  transactionIcon: {
    height: verticalScale(44),
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius._12,
  },
  transactionInfo: {
    flex: 1,
    gap: 3,
  },
  amountDate: {
    alignItems: "flex-end",
    gap: 3,
  },
  emptyState: {
    minHeight: verticalScale(220),
    alignItems: "center",
    justifyContent: "center",
    gap: spacingY._10,
    paddingHorizontal: spacingX._30,
  },
  loadMore: {
    minHeight: verticalScale(48),
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacingY._5,
  },
});
