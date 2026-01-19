import React, { useEffect } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 2000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="bg-black/75 backdrop-blur-md text-white px-6 py-5 rounded-2xl shadow-2xl flex flex-col items-center gap-3 min-w-[140px] animate-in zoom-in-95 fade-in duration-200">
        <div className={`p-2 rounded-full ${isSuccess ? 'bg-white/20' : 'bg-red-500/20'}`}>
          {isSuccess ? <Check size={32} strokeWidth={3} /> : <AlertCircle size={32} strokeWidth={3} className="text-red-400" />}
        </div>
        <p className="text-sm font-medium tracking-wide text-center">{message}</p>
      </div>
    </div>
  );
};