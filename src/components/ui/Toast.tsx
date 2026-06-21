import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import type { Toast } from '../../hooks/useToast';

const icons = {
  success: <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />,
  error: <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />,
};

const styles = {
  success: 'bg-white border-emerald-200 text-emerald-800 dark:bg-slate-800 dark:border-emerald-700 dark:text-emerald-300',
  error: 'bg-white border-rose-200 text-rose-800 dark:bg-slate-800 dark:border-rose-700 dark:text-rose-300',
  warning: 'bg-white border-amber-200 text-amber-800 dark:bg-slate-800 dark:border-amber-700 dark:text-amber-300',
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 48, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 48, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-zinc-900/10 text-sm font-medium min-w-64 max-w-sm ${styles[t.type]}`}
          >
            {icons[t.type]}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="opacity-50 hover:opacity-100 transition-opacity ml-1"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
