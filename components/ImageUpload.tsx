import { colors, radius } from "@/constants/theme";
import { getFilepath } from "@/services/imageService";
import { ImageUploadProps } from "@/types";
import { scale, verticalScale } from "@/utils/styling";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Icons from "phosphor-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Typo from "./Typo";

const ImageUpload = ({
  file = null,
  onClear,
  containerStyle,
  imageStyle,
  placeholder = "",
  onSelect,
}: ImageUploadProps) => {
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      onSelect(result.assets[0]);
    }
  };
  return (
    <View>
      {!file && (
        <TouchableOpacity
          onPress={pickImage}
          style={[styles.inputContainer, containerStyle && containerStyle]}
        >
          <Icons.UploadSimpleIcon color={colors.neutral200} />
          {placeholder && <Typo size={15}>{placeholder}</Typo>}
        </TouchableOpacity>
      )}

      {file && (
        <View style={[styles.image, imageStyle && imageStyle]}>
          <Image
            style={{ flex: 1 }}
            source={getFilepath(file)}
            contentFit="cover"
            transition={100}
          />
          <TouchableOpacity style={styles.deleteIcon} onPress={onClear}>
            <Icons.XCircleIcon
              size={verticalScale(24)}
              weight="fill"
              color={colors.white}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ImageUpload;

const styles = StyleSheet.create({
  inputContainer: {
    height: verticalScale(54),
    backgroundColor: colors.neutral700,
    borderRadius: radius._15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderColor: colors.neutral500,
    borderStyle: "dashed",
    borderWidth: 1,
  },
  image: {
    height: scale(100),
    width: scale(100),
    borderRadius: radius._15,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  deleteIcon: {
    position: "absolute",
    top: scale(6),
    right: scale(6),
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
});
