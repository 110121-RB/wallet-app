import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import {
  deleteSavingsGoal,
  getGoalContributions,
  getSavingsGoals,
} from "@/services/savingsService";
import { SavingsContributionType, SavingsGoalType } from "@/types";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const GoalDetails = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [goal, setGoal] = useState<SavingsGoalType>();
  const [items, setItems] = useState<SavingsContributionType[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const [goalsResult, contributionResult] = await Promise.all([
      getSavingsGoals(),
      getGoalContributions(id),
    ]);
    if (goalsResult.success)
      setGoal(
        (goalsResult.data as SavingsGoalType[]).find((item) => item.id === id),
      );
    if (contributionResult.success) setItems(contributionResult.data ?? []);
    setLoading(false);
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const formatDate = (date?: Date) =>
    date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      : "";
  const edit = () =>
    goal &&
    router.push({
      pathname: "/(modals)/goalModal",
      params: {
        id: goal.id,
        name: goal.name,
        targetAmount: String(goal.targetAmount),
        deadline: formatDate(goal.deadline),
        color: goal.color,
      },
    } as any);
  const editContribution = (item: SavingsContributionType) =>
    router.push({
      pathname: "/(modals)/goalContributionModal",
      params: {
        goalId: id,
        contributionId: item.id,
        amount: String(item.amount),
        note: item.note ?? "",
        date: formatDate(item.contributionDate),
      },
    } as any);
  const remove = () =>
    Alert.alert("Delete goal", "This also deletes its contribution history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteSavingsGoal(id);
          if (result.success) router.back();
          else Alert.alert("Savings", result.msg);
        },
      },
    ]);
  if (loading || !goal)
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  return (
    <ScreenWrapper style={{ backgroundColor: colors.black }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Typo size={22} fontWeight="700">
              {goal.name}
            </Typo>
            <Typo size={12} color={colors.neutral400}>
              {goal.deadline
                ? `Deadline ${goal.deadline.toLocaleDateString()}`
                : "No deadline"}
            </Typo>
          </View>
          <Pressable onPress={edit}>
            <Icons.PencilSimpleIcon size={22} color={colors.primary} />
          </Pressable>
          <Pressable onPress={remove}>
            <Icons.TrashIcon size={22} color={colors.rose} />
          </Pressable>
        </View>
        <View style={styles.hero}>
          <Typo size={13} color={colors.neutral400}>
            Saved
          </Typo>
          <Typo size={34} fontWeight="700">
            ¥{goal.savedAmount.toLocaleString()}
          </Typo>
          <Typo size={14} color={colors.neutral400}>
            of ¥{goal.targetAmount.toLocaleString()}
          </Typo>
          <View style={styles.track}>
            <View
              style={[
                styles.progress,
                {
                  width: `${Math.min(100, goal.progress)}%`,
                  backgroundColor: goal.color,
                },
              ]}
            />
          </View>
          <Typo size={13} color={colors.neutral300}>
            {goal.progress.toFixed(1)}% complete • ¥
            {goal.remaining.toLocaleString()} remaining
          </Typo>
        </View>
        <Button
          onPress={() =>
            router.push({
              pathname: "/(modals)/goalContributionModal",
              params: { goalId: id },
            } as any)
          }
        >
          <Typo color={colors.black} fontWeight="700">
            Add or withdraw money
          </Typo>
        </Button>
        <Typo size={18} fontWeight="600" style={{ marginTop: spacingY._20 }}>
          History
        </Typo>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Typo size={14} color={colors.neutral400}>
              No contributions yet
            </Typo>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => editContribution(item)}
            >
              <View
                style={[
                  styles.rowIcon,
                  { backgroundColor: item.amount > 0 ? "#14532d" : "#7f1d1d" },
                ]}
              >
                {item.amount > 0 ? (
                  <Icons.ArrowDownIcon size={18} color={colors.green} />
                ) : (
                  <Icons.ArrowUpIcon size={18} color={colors.rose} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Typo size={14} fontWeight="600">
                  {item.note ||
                    (item.amount > 0 ? "Savings added" : "Withdrawal")}
                </Typo>
                <Typo size={12} color={colors.neutral400}>
                  {item.contributionDate.toLocaleDateString()}
                </Typo>
              </View>
              <Typo
                size={14}
                color={item.amount > 0 ? colors.green : colors.rose}
                fontWeight="600"
              >
                {item.amount > 0 ? "+" : "-"}¥
                {Math.abs(item.amount).toLocaleString()}
              </Typo>
              <Icons.PencilSimpleIcon size={17} color={colors.neutral400} />
            </Pressable>
          )}
        />
      </View>
    </ScreenWrapper>
  );
};
export default GoalDetails;
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacingX._20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    gap: spacingX._12,
    alignItems: "center",
    paddingVertical: spacingY._20,
  },
  hero: {
    alignItems: "center",
    backgroundColor: colors.neutral800,
    borderRadius: radius._17,
    padding: spacingX._20,
    marginBottom: spacingY._15,
    gap: spacingY._7,
  },
  track: {
    height: 10,
    width: "100%",
    borderRadius: 10,
    backgroundColor: colors.neutral700,
    overflow: "hidden",
  },
  progress: { height: "100%", borderRadius: 10 },
  list: { gap: spacingY._10, paddingVertical: spacingY._12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    padding: spacingX._12,
    backgroundColor: colors.neutral800,
    borderRadius: radius._12,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
