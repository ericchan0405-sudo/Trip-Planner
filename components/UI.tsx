
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-[2rem] p-5 shadow-soft border-2 border-shadow-green transition-transform active:scale-[0.98] ${className}`}
  >
    {children}
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const styles = {
    primary: 'bg-leaf-green text-white',
    secondary: 'bg-warm-beige text-earth-brown border-2 border-shadow-green',
    danger: 'bg-red-400 text-white',
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`px-6 py-3 rounded-full font-bold shadow-soft transition-all active:scale-90 active:translate-y-1 ${styles[variant]} ${className} disabled:opacity-50`}
    >
      {children}
    </button>
  );
};

export const SectionTitle: React.FC<{ title: string; icon?: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex items-center gap-2 mb-4 mt-6">
    <div className="w-8 h-8 rounded-full bg-accent-orange flex items-center justify-center text-white text-sm">
      {icon}
    </div>
    <h2 className="text-xl font-bold text-earth-brown">{title}</h2>
  </div>
);
