import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  // key is a React reserved prop; it's never passed to the component at runtime.
  // It is declared here only to satisfy TS2322 at call-sites that spread JSX props
  // including `key` (e.g. <Card key={id} ...>). React strips it before calling render.
  key?: React.Key;
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

const Card = ({ children, className, title, subtitle }: CardProps) => (
  <div className={cn("bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:bg-slate-800 dark:border-slate-700", className)}>
    {title && (
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex flex-col gap-0.5 dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 font-medium dark:text-slate-500">{subtitle}</p>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

export { Card };
