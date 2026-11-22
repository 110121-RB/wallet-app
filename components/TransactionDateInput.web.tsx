import { colors, radius } from "@/constants/theme";
import React from "react";

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const TransactionDateInput = ({ value, onChange, maximumDate }: Props) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = event.currentTarget.value;

    if (!dateString) return;

    const [year, month, day] = dateString.split("-").map(Number);

    const selectedDate = new Date(year, month - 1, day);

    if (
      selectedDate.getFullYear() !== year ||
      selectedDate.getMonth() !== month - 1 ||
      selectedDate.getDate() !== day
    ) {
      return;
    }

    if (maximumDate) {
      const max = new Date(
        maximumDate.getFullYear(),
        maximumDate.getMonth(),
        maximumDate.getDate(),
      );

      if (selectedDate > max) return;
    }

    onChange(selectedDate);
  };

  return (
    <input
      type="date"
      aria-label="Transaction Date"
      value={formatDate(value)}
      max={maximumDate ? formatDate(maximumDate) : undefined}
      onChange={handleChange}
      style={{
        width: "100%",
        height: 70,
        boxSizing: "border-box",
        padding: "0 30px",
        backgroundColor: colors.neutral800,
        color: colors.white,
        border: `1px solid ${colors.neutral300}`,
        borderRadius: radius._15,
        fontSize: 20,
        fontFamily: "inherit",
        colorScheme: "dark",
        cursor: "pointer",
      }}
    />
  );
};

export default TransactionDateInput;
