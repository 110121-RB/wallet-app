import BackButton from "@/components/BackButton";
import SavingsGoalCard from "@/components/SavingsGoalCard";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { getSavingsGoals } from "@/services/savingsService";
import { SavingsGoalType } from "@/types";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const Goals = () => {
  const router = useRouter();
  const [goals, setGoals] = useState<SavingsGoalType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await getSavingsGoals();
    if (result.success) setGoals(result.data ?? []);
    else setError(result.msg || "Unable to load goals");
    setLoading(false);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const total = useMemo(
    () => goals.reduce((sum, goal) => sum + goal.savedAmount, 0),
    [goals],
  );
  const formatDate = (date?: Date) =>
    date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      : "";
  const open = (goal?: SavingsGoalType) =>
    router.push(
      goal
        ? ({
            pathname: "/(modals)/goalModal",
            params: {
              id: goal.id,
              name: goal.name,
              targetAmount: String(goal.targetAmount),
              deadline: formatDate(goal.deadline),
              color: goal.color,
            },
          } as any)
        : ("/(modals)/goalModal" as any),
    );
  return (
    <ScreenWrapper style={{ backgroundColor: colors.black }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Typo size={24} fontWeight="700">
              Savings Goals
            </Typo>
            <Typo size={13} color={colors.neutral400}>
              ¥{total.toLocaleString()} saved across {goals.length} goals
            </Typo>
          </View>
          <Pressable style={styles.add} onPress={() => open()}>
            <Icons.PlusIcon size={22} color={colors.black} weight="bold" />
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Typo size={14} color={colors.rose}>
              {error}
            </Typo>
            <Pressable onPress={() => void load()}>
              <Typo size={14} color={colors.primary}>
                Try again
              </Typo>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={goals}
            keyExtractor={(item) => item.id!}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <SavingsGoalCard
                goal={item}
                onPress={() =>
                  router.push({
                    pathname: "/goal-details",
                    params: { id: item.id },
                  } as any)
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Icons.TargetIcon size={46} color={colors.neutral500} />
                <Typo size={16}>No savings goals yet</Typo>
                <Typo size={13} color={colors.neutral400}>
                  Create a goal and start saving.
                </Typo>
                <Pressable style={styles.createButton} onPress={() => open()}>
                  <Icons.PlusIcon
                    size={19}
                    color={colors.black}
                    weight="bold"
                  />
                  <Typo size={14} color={colors.black} fontWeight="700">
                    Create Goal
                  </Typo>
                </Pressable>
              </View>
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
};
export default Goals;
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacingX._20 },
  header: {
    flexDirection: "row",
    gap: spacingX._12,
    alignItems: "center",
    paddingVertical: spacingY._20,
  },
  add: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { gap: spacingY._12, paddingBottom: spacingY._30, flexGrow: 1 },
  center: {
    flex: 1,
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
    gap: spacingY._10,
  },
  createButton: {
    marginTop: spacingY._10,
    minWidth: 160,
    height: 48,
    paddingHorizontal: spacingX._20,
    borderRadius: 15,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacingX._7,
  },
});
