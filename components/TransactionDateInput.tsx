import React, { useState } from "react";

import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { Platform, Pressable, StyleSheet, View } from "react-native";

import Typo from "@/components/Typo";

import { colors, radius, spacingX } from "@/constants/theme";

import { verticalScale } from "@/utils/styling";

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

const formatDisplayDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}年${month}月${day}日`;
};

const TransactionDateInput = ({ value, onChange, maximumDate }: Props) => {
  const [visible, setVisible] = useState(false);

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setVisible(false);
    }

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    onChange(selectedDate);
  };

  return (
    <View>
      {!visible && (
        <Pressable style={styles.dateButton} onPress={() => setVisible(true)}>
          <Typo size={14} color={colors.white}>
            {formatDisplayDate(value)}
          </Typo>
        </Pressable>
      )}

      {visible && (
        <View>
          <DateTimePicker
            themeVariant="dark"
            textColor={colors.white}
            value={value}
            maximumDate={maximumDate}
            locale={Platform.OS === "ios" ? "ja-JP" : undefined}
            timeZoneName="Asia/Tokyo"
            mode="date"
            display="spinner"
            onChange={handleDateChange}
          />

          {Platform.OS === "ios" && (
            <Pressable
              style={styles.dateButton}
              onPress={() => setVisible(false)}
            >
              <Typo size={15} fontWeight="500" color={colors.white}>
                Done
              </Typo>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

export default TransactionDateInput;

const styles = StyleSheet.create({
  dateButton: {
    height: verticalScale(54),
    paddingHorizontal: spacingX._15,
    borderColor: colors.neutral300,
    borderWidth: 1,
    borderRadius: radius._15,
    alignItems: "flex-start",
    justifyContent: "center",
  },
});
