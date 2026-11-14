"use client";
import { useEffect, useState } from "react";
import { fmt, parseNumber } from "../lib/format";

export default function MoneyInput({ value, onChange, disabled, placeholder, label, className = "" }:
  { value: number | null; onChange: (v: number | null) => void; disabled?: boolean; placeholder?: string; label?: string; className?: string }) {
  const [text, setText] = useState(value === null ? "" : fmt(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setText(value === null ? "" : fmt(value)); }, [value, focus]);
  const invalid = text.trim() !== "" && parseNumber(text) === null;

  return (
    <input
      inputMode="decimal" aria-label={label} disabled={disabled} placeholder={placeholder}
      value={text}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onChange={(e) => {
        setText(e.target.value);
        if (e.target.value.trim() === "") onChange(null);
        else { const n = parseNumber(e.target.value); if (n !== null) onChange(n); }
      }}
      className={`input text-right tabular-nums ${invalid ? "!border-red-400 !ring-red-200" : ""} ${className}`}
    />
  );
}
