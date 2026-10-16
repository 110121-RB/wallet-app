import { colors, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Icons from "phosphor-react-native";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function CustomTabs({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const tabbarIcons: any = {
    index: (isFocused: boolean) => (
      <Icons.House
        size={verticalScale(30)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : colors.neutral400}
      />
    ),
    statistics: (isFocused: boolean) => (
      <Icons.ChartBar
        size={verticalScale(30)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : colors.neutral400}
      />
    ),
    wallet: (isFocused: boolean) => (
      <Icons.Wallet
        size={verticalScale(30)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : colors.neutral400}
      />
    ),
    profile: (isFocused: boolean) => (
      <Icons.User
        size={verticalScale(30)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primary : colors.neutral400}
      />
    ),
  };
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const options = descriptors[route.key].options;

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        return (
          <TouchableOpacity
            key={route.name}
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => {
              if (!isFocused) {
                navigation.navigate(route.name as never);
              }
            }}
          >
            <Text
              style={{
                color: isFocused ? colors.primary : colors.white,
              }}
            >
              {String(label)}
            </Text>
            {tabbarIcons[route.name] && tabbarIcons[route.name](isFocused)}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    width: "100%",
    height: Platform.OS === "ios" ? verticalScale(73) : verticalScale(55),
    backgroundColor: colors.neutral800,
    justifyContent: "space-around",
    alignItems: "center",
    borderTopColor: colors.neutral700,
    borderTopWidth: 1,
  },
  tabbarItem: {
    marginBottom: Platform.OS === "ios" ? spacingY._10 : spacingY._5,
    justifyContent: "center",
    alignItems: "center",
  },
});
