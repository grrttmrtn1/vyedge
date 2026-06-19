import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Select = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) => (
  <div className="space-y-1">
    {label && (
      <label className="text-xs font-medium text-slate-600">{label}</label>
    )}
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500'
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
    {error && (
      <p className="text-[10px] text-rose-500 font-medium">{error}</p>
    )}
  </div>
);

export { Select };
