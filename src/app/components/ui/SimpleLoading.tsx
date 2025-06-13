import React from 'react';

interface SimpleLoadingProps {
  message?: string;
}

export const SimpleLoading: React.FC<SimpleLoadingProps> = ({ 
  message = "Chargement..." 
}) => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
};
