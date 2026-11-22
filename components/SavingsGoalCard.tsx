import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { SavingsGoalType } from "@/types";
import * as Icons from "phosphor-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

const money = (value: number) => `¥${Math.round(value).toLocaleString()}`;
const SavingsGoalCard = ({ goal, onPress }: { goal: SavingsGoalType; onPress: () => void }) => (
  <Pressable style={styles.card} onPress={onPress}>
    <View style={styles.header}><View style={[styles.icon, { backgroundColor: `${goal.color}22` }]}><Icons.TargetIcon size={24} color={goal.color} weight="fill" /></View><View style={{ flex: 1 }}><Typo size={17} fontWeight="600">{goal.name}</Typo><Typo size={12} color={colors.neutral400}>{goal.deadline ? `Due ${goal.deadline.toLocaleDateString()}` : "No deadline"}</Typo></View><Typo size={14} color={goal.progress >= 100 ? colors.green : goal.color} fontWeight="700">{goal.progress.toFixed(0)}%</Typo></View>
    <View style={styles.amount}><Typo size={22} fontWeight="700">{money(goal.savedAmount)}</Typo><Typo size={13} color={colors.neutral400}>of {money(goal.targetAmount)}</Typo></View>
    <View style={styles.track}><View style={[styles.progress, { width: `${Math.min(100, Math.max(0, goal.progress))}%`, backgroundColor: goal.progress >= 100 ? colors.green : goal.color }]} /></View>
    <View style={styles.footer}><Typo size={12} color={colors.neutral400}>{money(goal.remaining)} remaining</Typo>{goal.monthlyRequired > 0 && <Typo size={12} color={colors.neutral300}>{money(goal.monthlyRequired)}/month needed</Typo>}</View>
  </Pressable>
);
export default SavingsGoalCard;
const styles = StyleSheet.create({ card: { backgroundColor: colors.neutral800, borderRadius: radius._17, padding: spacingX._15, gap: spacingY._12 }, header: { flexDirection: "row", alignItems: "center", gap: spacingX._10 }, icon: { width: 44, height: 44, borderRadius: radius._12, alignItems: "center", justifyContent: "center" }, amount: { flexDirection: "row", gap: spacingX._7, alignItems: "baseline" }, track: { height: 9, backgroundColor: colors.neutral700, borderRadius: 9, overflow: "hidden" }, progress: { height: "100%", borderRadius: 9 }, footer: { flexDirection: "row", justifyContent: "space-between" } });
