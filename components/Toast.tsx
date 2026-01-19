import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-2 fade-in duration-300 w-[90%] max-w-sm">
      <div className={`flex items-center gap-3 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border backdrop-blur-md ${
        isSuccess 
          ? 'bg-white/90 border-green-100 text-green-800' 
          : 'bg-white/90 border-red-100 text-red-800'
      }`}>
        <div className={`shrink-0 ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>
          {isSuccess ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
        </div>
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button onClick={onClose} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};