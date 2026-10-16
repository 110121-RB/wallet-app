import CustomTabs from "@/components/CustomTabs";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React from "react";

const Layout = () => {
  return (
    <Tabs
      tabBar={(props: BottomTabBarProps) => <CustomTabs {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="statistics" options={{ title: "Statistics" }} />
      <Tabs.Screen name="wallet" options={{ title: "Wallet" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
};

export default Layout;
