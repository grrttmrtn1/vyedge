import React from 'react';

interface InlineConfirmProps {
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const InlineConfirm: React.FC<InlineConfirmProps> = ({
  message = 'Are you sure?',
  onConfirm,
  onCancel,
}) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-slate-600 font-medium">{message}</span>
    <button
      onClick={onConfirm}
      className="px-2 py-1 bg-rose-500 text-white rounded font-semibold hover:bg-rose-600 transition-colors"
    >
      Delete
    </button>
    <button
      onClick={onCancel}
      className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-semibold hover:bg-slate-200 transition-colors"
    >
      Cancel
    </button>
  </div>
);
