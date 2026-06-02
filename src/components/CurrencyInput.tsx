import { useState, useCallback } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

function formatVND(n: number): string {
  if (!n && n !== 0) return '';
  return n.toLocaleString('vi-VN');
}

function parseRaw(s: string): number {
  // Strip mọi ký tự không phải chữ số
  const digits = s.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export default function CurrencyInput({ value, onChange, className, style, placeholder }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState(() => formatVND(value));

  const handleFocus = useCallback(() => {
    setFocused(true);
    setDisplay(value ? formatVND(value) : '');
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    setDisplay(formatVND(value));
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseRaw(e.target.value);
    onChange(raw);
    setDisplay(raw ? formatVND(raw) : '');
  }, [onChange]);

  // Sync display khi value thay đổi từ bên ngoài (không đang focus)
  const formatted = formatVND(value);
  if (!focused && display !== formatted) {
    setDisplay(formatted);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      style={style}
      placeholder={placeholder ?? '0'}
      value={display}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
    />
  );
}
