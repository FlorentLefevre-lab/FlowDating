import React from 'react';

interface SimpleErrorProps {
  message: string;
  onRetry?: () => void;
}

export const SimpleError: React.FC<SimpleErrorProps> = ({ 
  message, 
  onRetry 
}) => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-red-500 text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Erreur
        </h3>
        <p className="text-gray-600 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
};