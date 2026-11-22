import BackButton from "@/components/BackButton";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import {
  deleteRecurringRule,
  getRecurringRules,
  processMyRecurringRules,
} from "@/services/recurringService";
import { RecurringRuleType } from "@/types";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
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

const Recurring = () => {
  const router = useRouter();
  const [rules, setRules] = useState<RecurringRuleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const processed = await processMyRecurringRules();
    if (!processed.success && !processed.msg?.includes("function"))
      setError(processed.msg || "Unable to process rules");
    const result = await getRecurringRules();
    if (result.success) setRules(result.data ?? []);
    else setError(result.msg || "Unable to load recurring transactions");
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const open = (rule?: RecurringRuleType) =>
    router.push(
      rule
        ? ({
            pathname: "/(modals)/recurringModal",
            params: {
              id: rule.id,
              walletId: rule.walletId,
              name: rule.name,
              type: rule.type,
              category: rule.category,
              amount: String(rule.amount),
              frequency: rule.frequency,
              nextRunDate: rule.nextRunDate.toISOString().slice(0, 10),
              isActive: String(rule.isActive),
            },
          } as any)
        : ("/(modals)/recurringModal" as any),
    );

  const remove = (rule: RecurringRuleType) =>
    Alert.alert("Delete rule", `Delete ${rule.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (rule.id) {
            await deleteRecurringRule(rule.id);
            void load();
          }
        },
      },
    ]);

  return (
    <ScreenWrapper style={{ backgroundColor: colors.black }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Typo size={24} fontWeight="700">
              Recurring
            </Typo>
            <Typo size={13} color={colors.neutral400}>
              Automatic income and expenses
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
            <Typo size={14} color={colors.rose} style={{ textAlign: "center" }}>
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
            data={rules}
            keyExtractor={(item) => item.id!}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.center}>
                <Icons.ArrowsClockwiseIcon
                  size={42}
                  color={colors.neutral500}
                />
                <Typo size={15}>No recurring rules yet</Typo>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={() => open(item)}>
                <View
                  style={[
                    styles.icon,
                    {
                      backgroundColor:
                        item.type === "income" ? "#14532d" : "#7f1d1d",
                    },
                  ]}
                >
                  <Icons.ArrowsClockwiseIcon
                    size={22}
                    color={item.type === "income" ? colors.green : colors.rose}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Typo size={16} fontWeight="600">
                    {item.name}
                  </Typo>
                  <Typo size={12} color={colors.neutral400}>
                    {item.frequency} • next{" "}
                    {item.nextRunDate.toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </Typo>
                </View>
                <Typo
                  size={15}
                  fontWeight="600"
                  color={item.type === "income" ? colors.green : colors.rose}
                >
                  {item.type === "income" ? "+" : "-"}¥
                  {item.amount.toLocaleString()}
                </Typo>
                <Pressable onPress={() => remove(item)}>
                  <Icons.TrashIcon size={19} color={colors.neutral400} />
                </Pressable>
              </Pressable>
            )}
          />
        )}
      </View>
    </ScreenWrapper>
  );
};
export default Recurring;
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
  list: { gap: spacingY._12, flexGrow: 1, paddingBottom: spacingY._30 },
  center: {
    flex: 1,
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
    gap: spacingY._10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    padding: spacingX._15,
    backgroundColor: colors.neutral800,
    borderRadius: radius._15,
  },
  icon: {
    width: 43,
    height: 43,
    borderRadius: radius._12,
    alignItems: "center",
    justifyContent: "center",
  },
});
