import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  isLoading = false,
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "relative px-4 py-2 rounded-full font-medium transition-all duration-200 active:scale-95 flex items-center justify-center";
  
  const variants = {
    primary: "bg-[#1a472a] text-white shadow-md hover:bg-[#143620] disabled:bg-[#1a472a]/70",
    secondary: "bg-[#f0fdf4] text-[#1a472a] hover:bg-[#dcfce7] disabled:bg-[#f0fdf4]/70",
    outline: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:bg-gray-50",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 disabled:text-gray-300"
  };

  const widthStyle = fullWidth ? "w-full" : "";
  const loadingStyle = isLoading ? "cursor-wait" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${loadingStyle} ${className}`} 
      disabled={disabled || isLoading}
      {...props}
    >
      {/* 
         Trick: Render content invisible when loading to maintain button width.
         Absolute position the spinner in the center.
      */}
      <span className={`flex items-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
        {children}
      </span>
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}
    </button>
  );
};