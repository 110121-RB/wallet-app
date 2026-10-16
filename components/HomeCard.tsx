import { colors, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";
import * as Icons from "phosphor-react-native";
import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import Typo from "./Typo";

type HomeCardProps = {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
};

const formatMoney = (value: number) => `¥${value.toLocaleString()}`;

const HomeCard = ({ balance, totalIncome, totalExpenses }: HomeCardProps) => (
  <ImageBackground
    source={require("../assets/images/card.png")}
    resizeMode="stretch"
    style={styles.bgImage}
  >
    <View style={styles.container}>
      <View>
        <View style={styles.totalBalanceRow}>
          <Typo color={colors.neutral800} size={17} fontWeight="500">
            Total Balance
          </Typo>
          <Icons.DotsThreeOutline
            size={verticalScale(23)}
            color={colors.black}
            weight="fill"
          />
        </View>
        <Typo color={colors.black} size={30} fontWeight="bold">
          {formatMoney(balance)}
        </Typo>
      </View>

      <View style={styles.stats}>
        <Stat
          icon="income"
          label="Income"
          value={totalIncome}
          color={colors.green}
        />
        <Stat
          icon="expense"
          label="Expense"
          value={totalExpenses}
          color={colors.rose}
        />
      </View>
    </View>
  </ImageBackground>
);

const Stat = ({
  icon,
  label,
  value,
  color,
}: {
  icon: "income" | "expense";
  label: string;
  value: number;
  color: string;
}) => {
  const Icon = icon === "income" ? Icons.ArrowDown : Icons.ArrowUp;

  return (
    <View style={{ gap: verticalScale(5) }}>
      <View style={styles.incomeExpense}>
        <View style={styles.statsIcon}>
          <Icon size={verticalScale(20)} color={colors.black} weight="bold" />
        </View>
        <Typo size={15} color={colors.neutral700} fontWeight="500">
          {label}
        </Typo>
      </View>
      <View style={{ alignSelf: "center" }}>
        <Typo size={17} color={color} fontWeight="600">
          {formatMoney(value)}
        </Typo>
      </View>
    </View>
  );
};

export default HomeCard;

const styles = StyleSheet.create({
  bgImage: { height: scale(210), width: "100%" },
  container: {
    padding: spacingX._20,
    paddingHorizontal: scale(23),
    height: "87%",
    width: "100%",
    justifyContent: "space-between",
  },
  totalBalanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacingY._5,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsIcon: {
    backgroundColor: colors.neutral350,
    padding: spacingY._5,
    borderRadius: 50,
  },
  incomeExpense: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingY._10,
  },
});
