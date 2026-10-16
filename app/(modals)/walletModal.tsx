import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Header from "@/components/Header";
import Input from "@/components/Input";
import ModalWrapper from "@/components/ModalWrapper";
import Typo from "@/components/Typo";
import WalletColorPicker from "@/components/WalletColorPicker";
import WalletIconPicker from "@/components/WalletIconPicker";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { getWalletIcon } from "@/constants/walletIcons";
import { AuthContext } from "@/contexts/authContext";
import { createOrUpdateWallet } from "@/services/walletService";
import { WalletType } from "@/types";
import { scale, verticalScale } from "@/utils/styling";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

const WalletModal = () => {
  const authContext = React.useContext(AuthContext);
  const user = authContext?.user;
  const params = useLocalSearchParams();
  const walletId = typeof params.id === "string" ? params.id : undefined;
  const isEditing = Boolean(walletId);

  const initialWalletData = useMemo<Partial<WalletType>>(
    () => ({
      id: walletId,
      name: typeof params.name === "string" ? params.name : "",
      iconName:
        typeof params.iconName === "string"
          ? (params.iconName as WalletType["iconName"])
          : "wallet",
      iconColor:
        typeof params.iconColor === "string" ? params.iconColor : "#FFFFFF",
      backgroundColor:
        typeof params.backgroundColor === "string"
          ? params.backgroundColor
          : "#6C63FF",
      amount: Number(params.amount ?? 0),
      totalIncome: Number(params.totalIncome ?? 0),
      totalExpenses: Number(params.totalExpenses ?? 0),
    }),
    [params, walletId],
  );

  const [walletData, setWalletData] =
    useState<Partial<WalletType>>(initialWalletData);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const SelectedWalletIcon = getWalletIcon(walletData.iconName);

  const onSubmit = async () => {
    const name = walletData.name?.trim();

    if (!name) {
      Alert.alert("Wallet", "Please enter wallet name");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Wallet", "User not found");
      return;
    }
    try {
      setLoading(true);

      const res = await createOrUpdateWallet({
        ...walletData,
        uid: user.uid,
        name,
        iconName: walletData.iconName ?? "wallet",
        iconColor: walletData.iconColor ?? "#FFFFFF",
        backgroundColor: walletData.backgroundColor ?? "#6C63FF",
        amount: walletData.amount ?? 0,
        totalIncome: walletData.totalIncome ?? 0,
        totalExpenses: walletData.totalExpenses ?? 0,
      });

      if (!res.success) {
        Alert.alert("Wallet", res.msg || "Failed to create wallet");
        return;
      }

      router.back();
    } catch (error: any) {
      console.log("Error creating wallet:", error);

      Alert.alert("Wallet", error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title={isEditing ? "Edit Wallet" : "New Wallet"}
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._10 }}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.form}
        >
          {/* Wallet preview */}
          <View style={styles.previewContainer}>
            <View
              style={[
                styles.walletPreview,
                {
                  backgroundColor: walletData.backgroundColor ?? "#6C63FF",
                },
              ]}
            >
              <SelectedWalletIcon
                size={34}
                color={walletData.iconColor ?? "#FFFFFF"}
                weight="fill"
              />
            </View>

          <Typo color={colors.neutral100} fontWeight="600" size={18}>
              {walletData.name?.trim() || (isEditing ? "Edit Wallet" : "New Wallet")}
            </Typo>
          </View>

          {/* Wallet name */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200}>Wallet Name</Typo>

            <Input
              placeholder="Salary"
              value={walletData.name ?? ""}
              onChangeText={(value) =>
                setWalletData((prev) => ({
                  ...prev,
                  name: value,
                }))
              }
            />
          </View>

          {/* Wallet icon */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200}>Wallet Icon</Typo>

            <WalletIconPicker
              selectedIcon={walletData.iconName ?? "wallet"}
              backgroundColor={walletData.backgroundColor ?? "#6C63FF"}
              onSelect={(iconName) =>
                setWalletData((prev) => ({
                  ...prev,
                  iconName,
                }))
              }
            />
          </View>

          {/* Wallet color */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200}>Wallet Color</Typo>

            <WalletColorPicker
              selectedColor={walletData.backgroundColor ?? "#6C63FF"}
              onSelect={(backgroundColor) =>
                setWalletData((prev) => ({
                  ...prev,
                  backgroundColor,
                }))
              }
            />
          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Button onPress={onSubmit} loading={loading} style={{ flex: 1 }}>
          <Typo color={colors.black} fontWeight="700">
            {isEditing ? "Update Wallet" : "Add Wallet"}
          </Typo>
        </Button>
      </View>
    </ModalWrapper>
  );
};

export default WalletModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacingY._20,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacingX._20,
    gap: scale(12),
    paddingTop: spacingY._15,
    borderTopColor: colors.neutral700,
    marginBottom: spacingY._5,
    borderTopWidth: 1,
  },
  form: {
    gap: spacingY._30,
    marginTop: spacingY._15,
    paddingBottom: spacingY._30,
  },
  avatarContainer: {
    position: "relative",
    alignSelf: "center",
  },
  avatar: {
    alignSelf: "center",
    backgroundColor: colors.neutral300,
    height: verticalScale(135),
    width: verticalScale(135),
    borderRadius: 200,
    borderWidth: 1,
    borderColor: colors.neutral500,
  },
  editIcon: {
    position: "absolute",
    bottom: spacingY._5,
    right: spacingY._7,
    borderRadius: 100,
    backgroundColor: colors.neutral100,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    padding: spacingY._7,
  },
  inputContainer: {
    gap: spacingY._10,
  },
  previewContainer: {
    alignItems: "center",
    gap: spacingY._10,
  },

  walletPreview: {
    width: verticalScale(76),
    height: verticalScale(76),
    borderRadius: verticalScale(24),
    alignItems: "center",
    justifyContent: "center",
  },
});
