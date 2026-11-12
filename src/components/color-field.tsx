"use client";

import { useState } from "react";

/** A colour swatch picker paired with an editable hex value. */
export function ColorField({
  name,
  label,
  defaultValue,
  compact = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);

  return (
    <div>
      <label className={compact ? "sr-only" : "label"} htmlFor={`${name}-hex`}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : "#000000"}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-11 cursor-pointer rounded-lg border border-line bg-surface-2 p-1"
        />
        <input
          id={`${name}-hex`}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          required
          className={`input font-mono ${compact ? "w-28" : "w-32"}`}
        />
      </div>
    </div>
  );
}
