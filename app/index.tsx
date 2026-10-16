import { colors } from "@/constants/theme";
import { AuthContext } from "@/contexts/authContext";
import { useRouter } from "expo-router";
import React, { useContext, useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";

const index = () => {
  const router = useRouter();
  const authContext = useContext(AuthContext);

  useEffect(() => {
    if (!authContext || authContext.loading) return;

    const timer = setTimeout(() => {
      router.replace(authContext.user ? "/(tabs)" : "/(auth)/welcome");
    }, 500);

    return () => clearTimeout(timer);
  }, [authContext?.loading, authContext?.user, router]);

  return (
    <View style={styles.container}>
      <Image
        style={styles.logo}
        resizeMode="contain"
        source={require("../assets/images/splashImage.png")}
      />
    </View>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral900,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    height: "20%",
    aspectRatio: 1,
  },
});
