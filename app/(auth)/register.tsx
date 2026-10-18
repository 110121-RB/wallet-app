import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Input from "@/components/Input";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { supabase } from "@/config/supabase";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { AuthContext } from "@/contexts/authContext";
import { verticalScale } from "@/utils/styling";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useContext, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";

const Register = () => {
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const nameRef = useRef("");

  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const authContext = useContext(AuthContext);

  // Support both Expo Native and Web
  const showMessage = (title: string, message: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.alert(`${title}\n${message}`);
      }
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return;

    const name = nameRef.current.trim();
    const email = emailRef.current.trim().toLowerCase();
    const password = passwordRef.current;

    // Validate form
    if (!name || !email || !password) {
      showMessage("Sign up", "Please fill in all fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage("Sign up", "Please enter a valid email");
      return;
    }

    if (password.length < 6) {
      showMessage("Sign up", "Password must contain at least 6 characters");
      return;
    }

    if (!authContext) {
      showMessage("Error", "Auth context not found");
      return;
    }

    setIsLoading(true);

    try {
      console.log("===== REGISTER START =====");

      const result = await authContext.register(email, password, name);

      console.log("Register result:", result);

      if (!result.success) {
        showMessage("Sign up failed", result.msg ?? "Unable to create account");
        return;
      }

      // Check whether Supabase created an active session.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session check error:", sessionError);
        showMessage("Registration", "Please sign in to continue.");
        router.replace("/(auth)/login");
        return;
      }

      // Registration may require email confirmation.
      const registeredUserIsSignedIn =
        !!session?.user && session.user.email?.toLowerCase() === email;

      if (!registeredUserIsSignedIn) {
        showMessage(
          "Check your email",
          "If your registration was accepted, please check your email for a confirmation link, then sign in.",
        );

        router.replace("/(auth)/login");
        return;
      }

      console.log("Register successful");
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Register error:", error);

      showMessage(
        "Sign up failed",
        error?.message ?? "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <BackButton iconSize={28} />

        <View style={{ gap: 5, marginTop: spacingY._20 }}>
          <Typo size={30} fontWeight="800">
            Let's
          </Typo>
          <Typo size={30} fontWeight="800">
            Get Started
          </Typo>
        </View>

        <View style={styles.form}>
          <Typo size={16} color={colors.textLighter}>
            Create an account to manage your finances
          </Typo>

          <Input
            placeholder="Enter your name"
            onChangeText={(value) => {
              nameRef.current = value;
            }}
            icon={
              <Icons.UserIcon
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />

          <Input
            placeholder="Enter your email"
            onChangeText={(value) => {
              emailRef.current = value;
            }}
            icon={
              <Icons.AtIcon
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />

          <Input
            placeholder="Enter your password"
            secureTextEntry
            onChangeText={(value) => {
              passwordRef.current = value;
            }}
            icon={
              <Icons.LockIcon
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />

          <Button loading={isLoading} onPress={handleSubmit}>
            <Typo fontWeight={"700"} color={colors.black} size={21}>
              Sign Up
            </Typo>
          </Button>
        </View>

        <View style={styles.footer}>
          <Typo size={15}>Already have an account?</Typo>

          <Pressable onPress={() => router.push("/(auth)/login")}>
            <Typo size={15} fontWeight={"700"} color={colors.primary}>
              Login
            </Typo>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacingY._30,
    paddingHorizontal: spacingX._20,
  },
  welcomeText: {
    fontSize: verticalScale(20),
    fontWeight: "bold",
    color: colors.text,
  },
  form: {
    gap: spacingY._20,
  },
  forgotPasswordText: {
    textAlign: "right",
    fontWeight: "500",
    color: colors.text,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  footerText: {
    textAlign: "center",
    color: colors.text,
    fontSize: verticalScale(15),
  },
});
