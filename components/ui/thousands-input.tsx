"use client";

import type { InputHTMLAttributes } from "react";

import { formatThousands, sanitizeNumberText } from "@/lib/format-number";

type ThousandsInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** Plain number text without separators, e.g. "2229700" or "1899.99". */
  value: string;
  onValueChange: (plain: string) => void;
  /** Allowed fraction digits (0 = integers only). */
  decimals?: number;
};

/**
 * Text input that shows thousands separators while keeping the plain number
 * text in form state. Pass `className` for styling/width.
 */
export function ThousandsInput({
  value,
  onValueChange,
  decimals = 0,
  ...props
}: ThousandsInputProps) {
  return (
    <input
      {...props}
      type="text"
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      value={formatThousands(value)}
      onChange={(e) => onValueChange(sanitizeNumberText(e.target.value, decimals))}
    />
  );
}
