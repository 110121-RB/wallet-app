import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Header from "@/components/Header";
import Input from "@/components/Input";
import ModalWrapper from "@/components/ModalWrapper";
import TransactionDateInput from "@/components/TransactionDateInput";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { saveSavingsGoal } from "@/services/savingsService";
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

const palette = ["#a3e635", "#38bdf8", "#a78bfa", "#fb7185", "#f59e0b"];

const parseDate = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return date;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const GoalModal = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const [name, setName] = useState(
    typeof params.name === "string" ? params.name : "",
  );
  const [target, setTarget] = useState(
    params.targetAmount ? String(params.targetAmount) : "",
  );
  const [deadline, setDeadline] = useState(parseDate(params.deadline));
  const [color, setColor] = useState(
    typeof params.color === "string" ? params.color : palette[0],
  );
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amount = Number(target.replace(/,/g, ""));

    if (!name.trim() || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Savings goal", "Enter a name and valid target");
      return;
    }

    setLoading(true);
    const result = await saveSavingsGoal({
      id,
      name,
      targetAmount: amount,
      currency: "JPY",
      deadline,
      color,
    });
    setLoading(false);

    if (!result.success) {
      Alert.alert("Savings goal", result.msg || "Unable to save goal");
      return;
    }

    router.back();
  };

  return (
    <ModalWrapper>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Header
            title={id ? "Edit Goal" : "New Goal"}
            leftIcon={<BackButton />}
          />

          <ScrollView
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Typo size={14}>Goal name</Typo>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Trip, emergency fund..."
              />
            </View>

            <View style={styles.field}>
              <Typo size={14}>Target amount</Typo>
              <Input
                value={target}
                onChangeText={setTarget}
                keyboardType="numeric"
                placeholder="100000"
              />
            </View>

            <View style={styles.field}>
              <Typo size={14}>Deadline</Typo>
              <TransactionDateInput value={deadline} onChange={setDeadline} />
            </View>

            <View style={styles.field}>
              <Typo size={14}>Color</Typo>
              <View style={styles.colors}>
                {palette.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setColor(item)}
                    style={[
                      styles.color,
                      { backgroundColor: item },
                      color === item && styles.selected,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.preview}>
              <Typo size={14} color={colors.neutral400}>
                Monthly estimate will be calculated automatically from the
                remaining amount and deadline.
              </Typo>
            </View>

            <Button
              style={styles.saveButton}
              loading={loading}
              onPress={() => void submit()}
            >
              <Typo color={colors.black} fontWeight="700">
                {id ? "Update Goal" : "Create Goal"}
              </Typo>
            </Button>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ModalWrapper>
  );
};

export default GoalModal;

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacingX._20 },
  form: {
    paddingTop: spacingY._25,
    gap: spacingY._20,
    paddingBottom: spacingY._30,
  },
  field: { gap: spacingY._10 },
  colors: { flexDirection: "row", gap: spacingX._12 },
  color: { width: 42, height: 42, borderRadius: 21 },
  selected: { borderWidth: 3, borderColor: colors.white },
  preview: {
    backgroundColor: colors.neutral700,
    borderRadius: radius._15,
    padding: spacingX._15,
  },
  saveButton: { width: "100%", marginTop: spacingY._5 },
});
