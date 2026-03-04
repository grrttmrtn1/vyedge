import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ children, className, title, subtitle }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string }) => (
  <div className={cn("bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm", className)}>
    {(title || subtitle) && (
      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/30">
        {title && <h3 className="text-sm font-bold text-zinc-900">{title}</h3>}
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

export const Button = ({ 
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
    outline: "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-200",
    ghost: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        "rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

export const Input = ({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder,
  error,
  icon: Icon,
  className
}: { 
  label?: string; 
  type?: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  placeholder?: string;
  error?: string;
  icon?: any;
  className?: string;
}) => (
  <div className={cn("space-y-1.5", className)}>
    {label && <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />}
      <input 
        type={type}
        value={value}
        onChange={onChange as any}
        placeholder={placeholder}
        className={cn(
          "w-full bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all",
          Icon ? "pl-10 pr-4 py-2.5" : "px-4 py-2.5",
          error && "border-red-500 focus:ring-red-500/5 focus:border-red-500"
        )}
      />
    </div>
    {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{error}</p>}
  </div>
);

export const Select = ({ 
  label, 
  value, 
  onChange, 
  options,
  error,
  className
}: { 
  label?: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  error?: string;
  className?: string;
}) => (
  <div className={cn("space-y-1.5", className)}>
    {label && <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <select 
      value={value}
      onChange={onChange}
      className={cn(
        "w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all appearance-none",
        error && "border-red-500 focus:ring-red-500/5 focus:border-red-500"
      )}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{error}</p>}
  </div>
);

export const Badge = ({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'success' | 'danger' | 'warning' | 'neutral' | 'info' }) => {
  const variants = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    danger: "bg-red-50 text-red-700 border-red-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    neutral: "bg-zinc-50 text-zinc-700 border-zinc-100",
    info: "bg-blue-50 text-blue-700 border-blue-100"
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", variants[variant])}>
      {children}
    </span>
  );
};
