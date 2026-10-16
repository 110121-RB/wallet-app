import { colors, spacingX } from "@/constants/theme";
import {
    walletIconMap,
    WalletIconName,
    walletIcons,
} from "@/constants/walletIcons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

type WalletIconPickerProps = {
  selectedIcon: WalletIconName;
  backgroundColor: string;
  onSelect: (iconName: WalletIconName) => void;
};

const WalletIconPicker = ({
  selectedIcon,
  backgroundColor,
  onSelect,
}: WalletIconPickerProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {walletIcons.map((icon) => {
        const IconComponent = walletIconMap[icon.name];
        const isSelected = selectedIcon === icon.name;

        return (
          <Pressable
            key={icon.name}
            accessibilityRole="button"
            accessibilityLabel={icon.label}
            onPress={() => onSelect(icon.name)}
            style={[
              styles.iconButton,
              isSelected && {
                borderColor: backgroundColor,
              },
            ]}
          >
            <View
              style={[
                styles.iconPreview,
                {
                  backgroundColor: isSelected
                    ? backgroundColor
                    : colors.neutral700,
                },
              ]}
            >
              <IconComponent
                size={26}
                color="#FFFFFF"
                weight={isSelected ? "fill" : "regular"}
              />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

export default WalletIconPicker;

const styles = StyleSheet.create({
  container: {
    gap: spacingX._10,
    paddingVertical: 2,
  },

  iconButton: {
    padding: 3,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },

  iconPreview: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
