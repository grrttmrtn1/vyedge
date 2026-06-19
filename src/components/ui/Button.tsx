import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Button = ({
  children,
  onClick,
  variant = 'primary',
  className,
  disabled,
  type = 'button',
  size = 'md'
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    outline: "bg-transparent text-zinc-900 border border-zinc-200 hover:bg-zinc-50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/10",
    ghost: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider",
    md: "px-4 py-2 text-sm font-semibold",
    lg: "px-6 py-3 text-base font-bold"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

export { Button };
