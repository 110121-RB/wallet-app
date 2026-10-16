import Button from "@/components/Button";
import HomeCard from "@/components/HomeCard";
import ScreenWrapper from "@/components/ScreenWrapper";
import TransactionList from "@/components/TransactionList";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
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
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
const Home = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const router = useRouter();
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
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
      loadData();
    }, [loadData]),
  );

  const summary = useMemo(
    () => getFinanceSummary(wallets, transactions),
    [wallets, transactions],
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* header */}
        <View style={styles.header}>
          <View style={{ gap: 4 }}>
            <Typo size={16} color={colors.neutral400}>
              Hello
            </Typo>
            <Typo size={20} fontWeight={"500"}>
              {authContext?.user?.name ?? "User"}
            </Typo>
          </View>
          <TouchableOpacity style={styles.searchIcon}>
            <Icons.MagnifyingGlassIcon
              size={verticalScale(20)}
              color={colors.neutral200}
              weight="bold"
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollViewStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* card */}
          <View>
            <HomeCard
              balance={summary.totalBalance}
              totalIncome={summary.totalIncome}
              totalExpenses={summary.totalExpenses}
            />
          </View>

          <TransactionList
            data={transactions.slice(0, 10)}
            loading={loading}
            emptyListMessage="No Transactions added yet!"
            title="Recent Transactions"
          />
        </ScrollView>

        <Button
          style={styles.floatingButton}
          onPress={() => router.push("/(modals)/transactionModal")}
        >
          <Icons.PlusIcon
            color={colors.black}
            weight="bold"
            size={verticalScale(24)}
          />
        </Button>
      </View>
    </ScreenWrapper>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
    marginTop: verticalScale(8),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacingY._10,
  },
  searchIcon: {
    backgroundColor: colors.neutral700,
    padding: spacingX._10,
    borderRadius: 50,
  },
  floatingButton: {
    height: verticalScale(50),
    width: verticalScale(50),
    borderRadius: 100,
    position: "absolute",
    bottom: verticalScale(30),
    right: verticalScale(30),
  },
  scrollViewStyle: {
    marginTop: spacingY._10,
    paddingBottom: verticalScale(100),
    gap: spacingY._25,
  },
});
