import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Card = ({ children, className, title, subtitle }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string }) => (
  <div className={cn("bg-white border border-zinc-200/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300", className)}>
    {title && (
      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/30 flex flex-col gap-0.5">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-900">{title}</h3>
        {subtitle && <p className="text-[10px] text-zinc-400 font-medium">{subtitle}</p>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

export { Card };
