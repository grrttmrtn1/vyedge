import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmModalProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl shadow-zinc-900/20 p-6 w-full max-w-sm mx-4"
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${variant === 'danger' ? 'bg-rose-50' : 'bg-amber-50'}`}>
                {variant === 'danger'
                  ? <AlertCircle size={20} className="text-rose-500" />
                  : <AlertTriangle size={20} className="text-amber-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant={variant === 'danger' ? 'danger' : 'secondary'}
                className="flex-1"
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
