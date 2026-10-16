import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Input from "@/components/Input";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { AuthContext } from "@/contexts/authContext";
import { verticalScale } from "@/utils/styling";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useContext, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

const Register = () => {
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const nameRef = useRef("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const authContext = useContext(AuthContext);

  const handleSubmit = async () => {
    if (!emailRef.current || !passwordRef.current || !nameRef.current) {
      Alert.alert("Sign up", "Please fill in all fields");
      return;
    }

    if (!authContext) {
      Alert.alert("Sign up", "Auth context not found");
      return;
    }

    let name = nameRef.current.trim();
    let email = emailRef.current.trim();
    let password = passwordRef.current.trim();

    setIsLoading(true);

    const result = await authContext.register(
      email,
      password,
      name,
    );

    setIsLoading(false);

    if (!result.success) {
      Alert.alert("Sign up", result.msg);
      return;
    }

    router.replace("/(tabs)");
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
        {/* {form} */}
        <View style={styles.form}>
          <Typo size={16} color={colors.textLighter}>
            Create an account to manage your finances
          </Typo>
          <Input
            placeholder="Enter your name"
            onChangeText={(value) => (nameRef.current = value)}
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
            onChangeText={(value) => (emailRef.current = value)}
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
            onChangeText={(value) => (passwordRef.current = value)}
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

        {/* {footer} */}
        <View style={styles.footer}>
          <Typo size={15}>Already have an account? </Typo>
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
