import React from 'react';

interface SimpleLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SimpleLoading: React.FC<SimpleLoadingProps> = ({
  message = "Chargement...",
  size = 'md'
}) => {
  const spinnerClass = {
    sm: 'spinner-sm',
    md: 'spinner-md',
    lg: 'spinner-lg'
  }[size];

  return (
    <div className="flex-center p-8">
      <div className="text-center">
        <div className={`${spinnerClass} mx-auto mb-3`}></div>
        <p className="text-caption">{message}</p>
      </div>
    </div>
  );
};
