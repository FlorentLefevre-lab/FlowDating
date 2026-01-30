// app/components/ui/PhotoCarousel.tsx
// Composant carousel de photos réutilisable

'use client';

import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Photo {
  id?: string;
  url: string;
  isPrimary?: boolean;
}

interface PhotoCarouselProps {
  photos: Photo[];
  className?: string;
  height?: string;
  showIndicators?: boolean;
  showArrows?: boolean;
  showCounter?: boolean;
  counterPosition?: 'top-left' | 'top-right';
  objectFit?: 'cover' | 'contain';
  overlay?: React.ReactNode;
  onPhotoChange?: (index: number) => void;
}

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
  photos,
  className = '',
  height = 'h-96',
  showIndicators = true,
  showArrows = true,
  showCounter = true,
  counterPosition = 'top-right',
  objectFit = 'cover',
  overlay,
  onPhotoChange
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Fallback si pas de photos
  const displayPhotos = photos.length > 0 ? photos : [{
    id: 'placeholder',
    url: 'https://via.placeholder.com/400x600/f3f4f6/9ca3af?text=Photo',
    isPrimary: true
  }];

  const goToNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (displayPhotos.length <= 1) return;
    setDirection(1);
    const newIndex = (currentIndex + 1) % displayPhotos.length;
    setCurrentIndex(newIndex);
    onPhotoChange?.(newIndex);
  }, [currentIndex, displayPhotos.length, onPhotoChange]);

  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (displayPhotos.length <= 1) return;
    setDirection(-1);
    const newIndex = (currentIndex - 1 + displayPhotos.length) % displayPhotos.length;
    setCurrentIndex(newIndex);
    onPhotoChange?.(newIndex);
  }, [currentIndex, displayPhotos.length, onPhotoChange]);

  const goToIndex = useCallback((index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index === currentIndex) return;
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
    onPhotoChange?.(index);
  }, [currentIndex, onPhotoChange]);

  // Gestion du swipe tactile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Animations Framer Motion
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div
      className={`relative overflow-hidden ${height} ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Photos avec animation */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          className="absolute inset-0"
        >
          <img
            src={displayPhotos[currentIndex].url}
            alt={`Photo ${currentIndex + 1}`}
            className={`w-full h-full object-${objectFit}`}
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      {/* Overlay personnalisé (gradient, infos, etc.) */}
      {overlay && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {overlay}
        </div>
      )}

      {/* Flèches de navigation */}
      {showArrows && displayPhotos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goToPrevious(e); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white text-gray-800 p-1.5 rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
            aria-label="Photo précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(e); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white text-gray-800 p-1.5 rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
            aria-label="Photo suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicateurs (points) */}
      {showIndicators && displayPhotos.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {displayPhotos.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); goToIndex(index, e); }}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Aller à la photo ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Compteur de photos */}
      {showCounter && displayPhotos.length > 1 && (
        <div className={`absolute z-20 bg-black/40 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm ${
          counterPosition === 'top-left' ? 'top-3 left-3' : 'top-3 right-3'
        }`}>
          {currentIndex + 1} / {displayPhotos.length}
        </div>
      )}
    </div>
  );
};

export default PhotoCarousel;
