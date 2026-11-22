import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Header from "@/components/Header";
import Input from "@/components/Input";
import ModalWrapper from "@/components/ModalWrapper";
import TransactionDateInput from "@/components/TransactionDateInput";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
import {
  addSavingsContribution,
  deleteSavingsContribution,
  updateSavingsContribution,
} from "@/services/savingsService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const GoalContributionModal = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const goalId = typeof params.goalId === "string" ? params.goalId : "";
  const contributionId =
    typeof params.contributionId === "string"
      ? params.contributionId
      : undefined;
  const initialAmount = Number(params.amount ?? 0);
  const [mode, setMode] = useState<"deposit" | "withdraw">(
    contributionId && initialAmount < 0 ? "withdraw" : "deposit",
  );
  const [amount, setAmount] = useState(
    contributionId ? String(Math.abs(initialAmount)) : "",
  );
  const [note, setNote] = useState(
    typeof params.note === "string" ? params.note : "",
  );
  const [date, setDate] = useState(() => {
    if (typeof params.date !== "string" || !params.date) return new Date();
    const [year, month, day] = params.date.split("-").map(Number);
    return new Date(year, month - 1, day);
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const submit = async () => {
    const value = Number(amount.replace(/,/g, ""));

    if (!goalId || !Number.isFinite(value) || value <= 0) {
      Alert.alert("Savings", "Enter a valid amount");
      return;
    }

    setLoading(true);
    const signedAmount = mode === "deposit" ? value : -value;
    const result = contributionId
      ? await updateSavingsContribution(
          contributionId,
          signedAmount,
          note,
          date,
        )
      : await addSavingsContribution(goalId, signedAmount, note, date);
    setLoading(false);

    if (!result.success) {
      Alert.alert("Savings", result.msg || "Unable to save contribution");
      return;
    }

    router.back();
  };

  const remove = async () => {
    if (!contributionId || deleting) return;
    setDeleting(true);
    const result = await deleteSavingsContribution(contributionId);
    setDeleting(false);

    if (!result.success) {
      Alert.alert("Savings", result.msg || "Unable to delete contribution");
      return;
    }

    router.back();
  };

  const confirmDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this history entry?")) void remove();
      return;
    }

    Alert.alert(
      "Delete history entry",
      "The savings total will be recalculated automatically.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void remove(),
        },
      ],
    );
  };

  return (
    <ModalWrapper>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Header
            title={contributionId ? "Edit History" : "Update Savings"}
            leftIcon={<BackButton />}
          />

          <ScrollView
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.segment}>
              {(["deposit", "withdraw"] as const).map((item) => (
                <Pressable
                  key={item}
                  style={[styles.option, mode === item && styles.active]}
                  onPress={() => setMode(item)}
                >
                  <Typo
                    size={14}
                    fontWeight="600"
                    color={mode === item ? colors.black : colors.white}
                  >
                    {item === "deposit" ? "Add money" : "Withdraw"}
                  </Typo>
                </Pressable>
              ))}
            </View>

            <View style={styles.field}>
              <Typo size={14}>Amount</Typo>
              <Input
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="10000"
              />
            </View>

            <View style={styles.field}>
              <Typo size={14}>Note (optional)</Typo>
              <Input
                value={note}
                onChangeText={setNote}
                placeholder="Monthly savings"
              />
            </View>

            <View style={styles.field}>
              <Typo size={14}>Date</Typo>
              <TransactionDateInput
                value={date}
                onChange={setDate}
                maximumDate={new Date()}
              />
            </View>

            <Button
              style={styles.saveButton}
              loading={loading}
              onPress={() => void submit()}
            >
              <Typo color={colors.black} fontWeight="700">
                {mode === "deposit"
                  ? "Confirm Add Savings"
                  : "Confirm Withdrawal"}
              </Typo>
            </Button>

            {contributionId && (
              <Pressable
                disabled={loading || deleting}
                onPress={confirmDelete}
                style={styles.deleteButton}
              >
                <Typo color={colors.rose} fontWeight="600" size={14}>
                  {deleting ? "Deleting..." : "Delete history entry"}
                </Typo>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ModalWrapper>
  );
};

export default GoalContributionModal;

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacingX._20 },
  form: {
    paddingTop: spacingY._25,
    paddingBottom: spacingY._30,
    gap: spacingY._20,
  },
  field: { gap: spacingY._10 },
  segment: { flexDirection: "row", gap: spacingX._10 },
  option: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.neutral600,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  active: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  saveButton: { width: "100%", marginTop: spacingY._10 },
  deleteButton: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: colors.rose,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
