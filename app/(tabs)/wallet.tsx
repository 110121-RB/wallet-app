import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { getWalletIcon } from "@/constants/walletIcons";
import { AuthContext } from "@/contexts/authContext";
import { getUserTransactions } from "@/services/transactionService";
import { deleteWallet, getUserWallets } from "@/services/walletService";
import { TransactionType, WalletType } from "@/types";
import { getFinanceSummary, WalletFinanceSummary } from "@/utils/finance";
import { verticalScale } from "@/utils/styling";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const Wallet = () => {
  const router = useRouter();
  const user = useContext(AuthContext)?.user;
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const [walletResult, transactionResult] = await Promise.all([
        getUserWallets(user.uid),
        getUserTransactions(user.uid),
      ]);

      if (!walletResult.success) {
        Alert.alert("Wallet", walletResult.msg || "Failed to load wallets");
        return;
      }

      if (!transactionResult.success) {
        Alert.alert(
          "Transaction",
          transactionResult.msg || "Failed to load transactions",
        );
        return;
      }

      setWallets((walletResult.data ?? []) as WalletType[]);
      setTransactions((transactionResult.data ?? []) as TransactionType[]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const finance = useMemo(
    () => getFinanceSummary(wallets, transactions),
    [wallets, transactions],
  );

  const openWalletModal = (wallet?: WalletType) => {
    if (!wallet) {
      router.push("/(modals)/walletModal");
      return;
    }

    router.push({
      pathname: "/(modals)/walletModal",
      params: {
        id: wallet.id,
        name: wallet.name,
        iconName: wallet.iconName,
        iconColor: wallet.iconColor,
        backgroundColor: wallet.backgroundColor,
        amount: String(wallet.amount),
        totalIncome: String(wallet.totalIncome),
        totalExpenses: String(wallet.totalExpenses),
      },
    });
  };

  const handleDeleteWallet = (wallet: WalletType) => {
    if (!wallet.id || !user?.uid) return;
    const uid = user.uid;

    Alert.alert("Delete wallet", `Delete ${wallet.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteWallet(wallet.id!, uid);

          if (!result.success) {
            Alert.alert("Wallet", result.msg || "Failed to delete wallet");
            return;
          }

          fetchData();
        },
      },
    ]);
  };

  const renderWallet = ({ item }: { item: WalletFinanceSummary }) => {
    const Icon = getWalletIcon(item.wallet.iconName);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openWalletModal(item.wallet)}
        style={styles.walletItem}
      >
        <View
          style={[
            styles.walletIcon,
            {
              backgroundColor: item.wallet.backgroundColor || colors.neutral700,
            },
          ]}
        >
          <Icon
            size={verticalScale(24)}
            color={item.wallet.iconColor}
            weight="fill"
          />
        </View>

        <View style={styles.walletInfo}>
          <Typo size={16} fontWeight="500" color={colors.neutral100}>
            {item.wallet.name}
          </Typo>
          <Typo size={13} color={colors.neutral400}>
            Income ¥{item.totalIncome.toLocaleString()} | Expense ¥
            {item.totalExpenses.toLocaleString()}
          </Typo>
        </View>

        <Typo size={16} fontWeight="600" color={colors.neutral100}>
          ¥{item.balance.toLocaleString()}
        </Typo>

        <TouchableOpacity
          onPress={() => handleDeleteWallet(item.wallet)}
          style={styles.deleteButton}
        >
          <Icons.TrashIcon size={verticalScale(19)} color={colors.rose} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper style={{ backgroundColor: colors.black }}>
      <View style={styles.container}>
        <View style={styles.balanceView}>
          <View style={{ alignItems: "center" }}>
            <Typo size={45} fontWeight="500">
              ¥{finance.totalBalance.toLocaleString()}
            </Typo>
            <Typo size={16} color={colors.neutral300}>
              Total Balance
            </Typo>
          </View>
        </View>

        <View style={styles.wallets}>
          <View style={styles.flexRow}>
            <Typo size={20} fontWeight="500">
              My Wallets
            </Typo>
            <TouchableOpacity onPress={() => openWalletModal()}>
              <Icons.PlusCircleIcon
                weight="fill"
                color={colors.primary}
                size={verticalScale(33)}
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={finance.wallets}
              renderItem={renderWallet}
              keyExtractor={(item) => item.wallet.id ?? item.wallet.name}
              contentContainerStyle={styles.listStyle}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <Typo size={15} color={colors.neutral400}>
                    No wallets yet
                  </Typo>
                </View>
              }
            />
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default Wallet;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacingX._20 },
  balanceView: {
    height: verticalScale(160),
    backgroundColor: colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  flexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacingY._10,
  },
  wallets: {
    flex: 1,
    backgroundColor: colors.neutral900,
    borderTopRightRadius: radius._30,
    borderTopLeftRadius: radius._30,
    padding: spacingX._20,
    paddingTop: spacingX._25,
  },
  listStyle: {
    paddingVertical: spacingY._25,
    paddingTop: spacingY._15,
    gap: spacingY._12,
  },
  walletItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._12,
    backgroundColor: colors.neutral800,
    borderRadius: radius._15,
    padding: spacingX._15,
  },
  deleteButton: {
    width: verticalScale(34),
    height: verticalScale(34),
    borderRadius: radius._10,
    backgroundColor: colors.neutral700,
    justifyContent: "center",
    alignItems: "center",
  },
  walletIcon: {
    width: verticalScale(46),
    height: verticalScale(46),
    borderRadius: radius._15,
    justifyContent: "center",
    alignItems: "center",
  },
  walletInfo: { flex: 1, gap: 2 },
  centerState: {
    minHeight: verticalScale(160),
    justifyContent: "center",
    alignItems: "center",
  },
});
