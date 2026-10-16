import { AuthContext, AuthProvider } from "@/contexts/authContext";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useContext, useEffect } from "react";
import { StyleSheet } from "react-native";

const StackLayout = () => {
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!authContext || authContext.loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (authContext.user && inAuthGroup) {
      router.replace("/(tabs)");
      return;
    }

    if (!authContext.user && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    }
  }, [authContext?.loading, authContext?.user, router, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="(modals)/profileModal"
        options={{
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="(modals)/walletModal"
        options={{
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="(modals)/transactionModal"
        options={{
          presentation: "modal",
        }}
      />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <StackLayout></StackLayout>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({});
