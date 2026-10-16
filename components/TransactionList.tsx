import Loading from "@/components/Loading";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { getWalletIcon } from "@/constants/walletIcons";
import { TransactionType } from "@/types";
import { verticalScale } from "@/utils/styling";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type TransactionListProps = {
  data: TransactionType[];
  title?: string;
  loading?: boolean;
  emptyListMessage?: string;
};

const formatDateForRoute = (date?: Date) => {
  if (!date) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date?: Date) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}年${month}月${day}日`;
};

const TransactionList = ({
  data,
  title,
  loading = false,
  emptyListMessage = "No transactions yet",
}: TransactionListProps) => {
  const router = useRouter();

  const handleClick = (transaction: TransactionType) => {
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

  return (
    <View style={styles.container}>
      {title && (
        <Typo size={20} fontWeight="500">
          {title}
        </Typo>
      )}

      {loading ? (
        <View style={styles.loadingState}>
          <Loading />
        </View>
      ) : (
        <FlashList
          data={data}
          keyExtractor={(item) => item.id ?? `${item.name}-${item.amount}`}
          renderItem={({ item, index }) => (
            <TransactionItem
              item={item}
              index={index}
              onPress={() => handleClick(item)}
            />
          )}
          ListEmptyComponent={
            <Typo size={15} color={colors.neutral400} style={styles.emptyText}>
              {emptyListMessage}
            </Typo>
          }
          scrollEnabled={false}
        />
      )}
    </View>
  );
};

const TransactionItem = ({
  item,
  index,
  onPress,
}: {
  item: TransactionType;
  index: number;
  onPress: () => void;
}) => {
  const Icon = getWalletIcon(item.iconName ?? "wallet");
  const isIncome = item.type === "income";

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70)
        .springify()
        .damping(14)}
    >
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.icon,
            { backgroundColor: item.backgroundColor ?? colors.neutral700 },
          ]}
        >
          <Icon
            size={verticalScale(25)}
            weight="fill"
            color={item.iconColor ?? colors.white}
          />
        </View>

        <View style={styles.transactionInfo}>
          <Typo size={17}>{item.name}</Typo>
          <Typo size={12} color={colors.neutral400}>
            {isIncome ? "Income" : "Expense"}
          </Typo>
        </View>

        <View style={styles.amountDate}>
          <Typo fontWeight="500" color={isIncome ? colors.green : colors.rose}>
            {isIncome ? "+" : "-"}¥{item.amount.toLocaleString()}
          </Typo>
          <Typo size={12} color={colors.neutral400}>
            {formatDisplayDate(item.transactionDate)}
          </Typo>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default TransactionList;

const styles = StyleSheet.create({
  container: { gap: spacingY._17, minHeight: verticalScale(90) },
  loadingState: { minHeight: verticalScale(100), justifyContent: "center" },
  emptyText: { textAlign: "center", marginTop: spacingY._15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._12,
    marginBottom: spacingY._12,
    backgroundColor: colors.neutral800,
    padding: spacingY._10,
    paddingHorizontal: spacingY._10,
    borderRadius: radius._17,
  },
  icon: {
    height: verticalScale(44),
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius._12,
  },
  transactionInfo: { flex: 1, gap: 2.5 },
  amountDate: { alignItems: "flex-end", gap: 3 },
});
