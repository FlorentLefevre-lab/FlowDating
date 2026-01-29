import React from 'react';
import { Button } from './button';

interface SimpleErrorProps {
  message: string;
  onRetry?: () => void;
}

export const SimpleError: React.FC<SimpleErrorProps> = ({
  message,
  onRetry
}) => {
  return (
    <div className="flex-center p-8">
      <div className="text-center">
        <div className="text-red-500 text-4xl mb-3">⚠️</div>
        <h3 className="text-subheading mb-2">
          Erreur
        </h3>
        <p className="text-body mb-4">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            Réessayer
          </Button>
        )}
      </div>
    </div>
  );
};
