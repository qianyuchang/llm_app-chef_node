import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-4 py-2 rounded-full font-medium transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[#1a472a] text-white shadow-md hover:bg-[#143620]",
    secondary: "bg-[#f0fdf4] text-[#1a472a] hover:bg-[#dcfce7]",
    outline: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};