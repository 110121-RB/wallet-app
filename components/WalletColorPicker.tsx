import { colors, spacingX } from "@/constants/theme";
import { walletColors } from "@/constants/walletColors";
import { CheckIcon } from "phosphor-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

type WalletColorPickerProps = {
  selectedColor: string;
  onSelect: (color: string) => void;
};

const WalletColorPicker = ({
  selectedColor,
  onSelect,
}: WalletColorPickerProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {walletColors.map((color) => {
        const isSelected = selectedColor === color;

        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={`Select color ${color}`}
            onPress={() => onSelect(color)}
            style={[styles.colorWrapper, isSelected && styles.selectedWrapper]}
          >
            <View
              style={[
                styles.colorCircle,
                {
                  backgroundColor: color,
                },
              ]}
            >
              {isSelected && (
                <CheckIcon size={18} color="#FFFFFF" weight="bold" />
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

export default WalletColorPicker;

const styles = StyleSheet.create({
  container: {
    gap: spacingX._10,
    paddingVertical: 2,
  },

  colorWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },

  selectedWrapper: {
    borderColor: colors.neutral100,
  },

  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
