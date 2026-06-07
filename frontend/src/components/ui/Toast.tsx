'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore, ToastType } from '@/store/toastStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  error: <AlertCircle className="w-5 h-5 text-rose-400" />,
  info: <Info className="w-5 h-5 text-sky-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
};

const toastStyles: Record<ToastType, string> = {
  success: 'border-emerald-500/20 bg-emerald-500/10',
  error: 'border-rose-500/20 bg-rose-500/10',
  info: 'border-sky-500/20 bg-sky-500/10',
  warning: 'border-amber-500/20 bg-amber-500/10',
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className={clsx(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl min-w-[300px] max-w-md',
              toastStyles[toast.type]
            )}
          >
            <div className="flex-shrink-0">{icons[toast.type]}</div>
            <p className="flex-1 text-sm font-medium text-white/90">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white/40 hover:text-white" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
